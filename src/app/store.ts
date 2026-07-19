import { create } from 'zustand';
import type {
  AlarmConfig,
  Mood,
  Movement,
  SleepSession,
  UserSettings,
} from '../domain/types';
import { computeQualityScore } from '../domain/score';
import { armAlarm, expireOneShots } from '../domain/alarmFire';
import {
  DEFAULT_SETTINGS,
  alarmRepo,
  dataFaults,
  runtimeRepo,
  settingsRepo,
  sleepRepo,
  type DataFault,
} from '../data/repositories';
import { uid } from '../lib/id';
import { syncSchedules } from '../lib/notifications';
import { mirrorSleepToHealth } from '../lib/health';
import { pushWidgetSnapshot } from '../lib/widget';
import { widgetSnapshot } from '../domain/widgetSnapshot';

/**
 * Recompute and publish the home-screen widget snapshot. Called alongside
 * `syncSchedules` after anything that moves the log or the target duration,
 * so the widget never disagrees with the app. Best-effort and no-op off-device.
 */
const refreshWidget = (sessions: SleepSession[], settings: UserSettings) =>
  void pushWidgetSnapshot(widgetSnapshot(sessions, settings.targetDurationMin));

export type ActiveSession = {
  id: string;
  startedAt: string;
} | null;

/**
 * Longest night we will restore. Past this, a session that survived in storage
 * is an abandoned one (the user stopped using the app mid-session), and
 * resuming it would invent a 40-hour night rather than recover a real one.
 */
const MAX_ACTIVE_HOURS = 20;

/** Mirror the two transient fields to storage after every transition. */
const persistRuntime = (get: () => AppState) => {
  const { active, pendingMorning } = get();
  void runtimeRepo.set({ active, pendingMorning });
};

interface AppState {
  loaded: boolean;
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings;

  /** In-progress sleep session (null when awake). */
  active: ActiveSession;
  /** Session awaiting the morning check (set after waking). */
  pendingMorning: SleepSession | null;
  /** Reads that could not be trusted this launch; surfaced in Settings. */
  faults: DataFault[];

  init(): Promise<void>;

  startSession(): void;
  endSession(movements?: Movement[], smartWoke?: boolean): void;
  cancelSession(): void;

  saveMorningCheck(input: {
    mood: Mood;
    subjective?: number;
    note?: string;
    theme?: string;
  }): Promise<void>;
  dismissMorning(): Promise<void>;

  updateSession(session: SleepSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  saveAlarm(alarm: AlarmConfig): Promise<void>;
  deleteAlarm(id: string): Promise<void>;

  saveSettings(settings: UserSettings): Promise<void>;
  replaceSessions(sessions: SleepSession[]): Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  sessions: [],
  alarms: [],
  settings: DEFAULT_SETTINGS,
  active: null,
  pendingMorning: null,
  faults: [],

  async init() {
    const [sessions, alarms, settings, runtime] = await Promise.all([
      sleepRepo.all(),
      alarmRepo.all(),
      settingsRepo.get(),
      runtimeRepo.get(),
    ]);
    // A one-shot alarm whose moment has passed retires here, so it can never
    // be re-armed for tonight by the scheduler below.
    const live = expireOneShots(alarms, new Date());
    live.forEach((a, i) => {
      if (a !== alarms[i]) void alarmRepo.save(a);
    });
    let active = runtime.active;
    if (active) {
      const ageH = (Date.now() - Date.parse(active.startedAt)) / 3_600_000;
      // Stale or future-dated: drop it rather than fabricate a duration.
      if (!(ageH >= 0 && ageH <= MAX_ACTIVE_HOURS)) active = null;
    }
    set({
      sessions,
      alarms: live,
      settings,
      active,
      pendingMorning: runtime.pendingMorning,
      // Recorded by the repository reads that just ran above.
      faults: dataFaults(),
      loaded: true,
    });
    if (!active && runtime.active) {
      void runtimeRepo.set({ active: null, pendingMorning: runtime.pendingMorning });
    }
    void syncSchedules(live, settings, sessions);
    refreshWidget(sessions, settings);
  },

  startSession() {
    set({ active: { id: uid(), startedAt: new Date().toISOString() } });
    persistRuntime(get);
  },

  endSession(movements, smartWoke) {
    const { active } = get();
    if (!active) return;
    const endedAt = new Date().toISOString();
    const durationMin = Math.max(
      0,
      Math.round(
        (new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) /
          60000,
      ),
    );
    const session: SleepSession = {
      id: active.id,
      startedAt: active.startedAt,
      endedAt,
      durationMin,
      ...(movements ? { movements } : {}),
      ...(smartWoke ? { smartWoke: true } : {}),
    };
    set({ active: null, pendingMorning: session });
    persistRuntime(get);
  },

  cancelSession() {
    set({ active: null });
    persistRuntime(get);
  },

  async saveMorningCheck({ mood, subjective, note, theme }) {
    const { pendingMorning, settings } = get();
    if (!pendingMorning) return;
    // Claim the pending night BEFORE the awaited write. Two fast taps would
    // otherwise both pass the guard above and append the same night twice.
    set({ pendingMorning: null });
    persistRuntime(get);
    const qualityScore = computeQualityScore(
      pendingMorning.durationMin,
      mood,
      settings.targetDurationMin,
      pendingMorning.movements,
    );
    const session: SleepSession = {
      ...pendingMorning,
      mood,
      subjective,
      note: note?.trim() ? note.trim() : undefined,
      theme: theme?.trim() ? theme.trim() : undefined,
      qualityScore,
    };
    await sleepRepo.save(session);
    set((s) => ({ sessions: [...s.sessions, session] }));
    if (settings.healthSync) void mirrorSleepToHealth(session);
    void syncSchedules(get().alarms, settings, get().sessions);
    refreshWidget(get().sessions, settings);
  },

  async dismissMorning() {
    // Persist the duration-only session even if the user skips the check.
    const { pendingMorning, settings } = get();
    if (!pendingMorning) return;
    try {
      await sleepRepo.save(pendingMorning);
    } catch {
      // Keep the night pending rather than clearing it: a failed write must
      // leave the check outstanding, not delete the night.
      return;
    }
    set((s) => ({
      sessions: [...s.sessions, pendingMorning],
      pendingMorning: null,
    }));
    persistRuntime(get);
    if (settings.healthSync) void mirrorSleepToHealth(pendingMorning);
    void syncSchedules(get().alarms, settings, get().sessions);
    refreshWidget(get().sessions, settings);
  },

  async updateSession(session) {
    await sleepRepo.save(session);
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? session : x)),
    }));
    void syncSchedules(get().alarms, get().settings, get().sessions);
    refreshWidget(get().sessions, get().settings);
  },

  async deleteSession(id) {
    await sleepRepo.remove(id);
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    void syncSchedules(get().alarms, get().settings, get().sessions);
    refreshWidget(get().sessions, get().settings);
  },

  async saveAlarm(input) {
    // Arm one-shots to a concrete instant on the way in, so both the OS
    // scheduler and the expiry pass have something absolute to work from.
    const alarm = armAlarm(input, new Date());
    await alarmRepo.save(alarm);
    const alarms = (() => {
      const list = get().alarms;
      const idx = list.findIndex((a) => a.id === alarm.id);
      if (idx >= 0) return list.map((a) => (a.id === alarm.id ? alarm : a));
      return [...list, alarm];
    })();
    set({ alarms });
    void syncSchedules(alarms, get().settings, get().sessions);
  },

  async deleteAlarm(id) {
    await alarmRepo.remove(id);
    const alarms = get().alarms.filter((a) => a.id !== id);
    set({ alarms });
    void syncSchedules(alarms, get().settings, get().sessions);
  },

  async saveSettings(settings) {
    await settingsRepo.set(settings);
    set({ settings });
    void syncSchedules(get().alarms, settings, get().sessions);
    refreshWidget(get().sessions, settings);
  },

  async replaceSessions(sessions) {
    await sleepRepo.replaceAll(sessions);
    set({ sessions });
    void syncSchedules(get().alarms, get().settings, sessions);
    refreshWidget(sessions, get().settings);
  },
}));
