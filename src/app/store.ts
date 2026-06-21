import { create } from 'zustand';
import type {
  AlarmConfig,
  Mood,
  MotionMode,
  Movement,
  SleepSession,
  UserSettings,
} from '../domain/types';
import { computeQualityScore } from '../domain/score';
import {
  DEFAULT_SETTINGS,
  alarmRepo,
  settingsRepo,
  sharpnessRepo,
  sleepRepo,
} from '../data/repositories';
import type { SharpnessResult } from '../domain/sharpness';
import { uid } from '../lib/id';
import { syncSchedules } from '../lib/notifications';
import {
  mirrorSleepToHealth,
  readHealthSleep,
  requestHealthReadAccess,
} from '../lib/health';
import { sessionsFromHealth } from '../domain/healthImport';
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

interface AppState {
  loaded: boolean;
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings;
  sharpness: SharpnessResult[];

  /** In-progress sleep session (null when awake). */
  active: ActiveSession;
  /** Session awaiting the morning check (set after waking). */
  pendingMorning: SleepSession | null;

  init(): Promise<void>;

  startSession(): void;
  endSession(
    movements?: Movement[],
    smartWoke?: boolean,
    motionSource?: MotionMode,
  ): void;
  cancelSession(): void;

  saveMorningCheck(input: {
    mood: Mood;
    subjective?: number;
    note?: string;
    theme?: string;
  }): Promise<void>;
  dismissMorning(): void;

  updateSession(session: SleepSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  saveAlarm(alarm: AlarmConfig): Promise<void>;
  deleteAlarm(id: string): Promise<void>;

  saveSettings(settings: UserSettings): Promise<void>;
  replaceSessions(sessions: SleepSession[]): Promise<void>;

  /**
   * Pull sleep from Apple Health over the trailing `days` days, merging only
   * nights that don't overlap existing sessions. Returns how many were added.
   */
  importFromHealth(days: number): Promise<number>;

  /** Record a completed sharpness-check result. */
  saveSharpness(result: SharpnessResult): Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  sessions: [],
  alarms: [],
  settings: DEFAULT_SETTINGS,
  sharpness: [],
  active: null,
  pendingMorning: null,

  async init() {
    const [sessions, alarms, settings, sharpness] = await Promise.all([
      sleepRepo.all(),
      alarmRepo.all(),
      settingsRepo.get(),
      sharpnessRepo.all(),
    ]);
    set({ sessions, alarms, settings, sharpness, loaded: true });
    void syncSchedules(alarms, settings, sessions);
    refreshWidget(sessions, settings);
  },

  startSession() {
    set({ active: { id: uid(), startedAt: new Date().toISOString() } });
  },

  endSession(movements, smartWoke, motionSource) {
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
      ...(motionSource ? { motionSource } : {}),
    };
    set({ active: null, pendingMorning: session });
  },

  cancelSession() {
    set({ active: null });
  },

  async saveMorningCheck({ mood, subjective, note, theme }) {
    const { pendingMorning, settings } = get();
    if (!pendingMorning) return;
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
    set((s) => ({
      sessions: [...s.sessions, session],
      pendingMorning: null,
    }));
    if (settings.healthSync) void mirrorSleepToHealth(session);
    void syncSchedules(get().alarms, settings, get().sessions);
    refreshWidget(get().sessions, settings);
  },

  dismissMorning() {
    // Persist the duration-only session even if the user skips the check.
    const { pendingMorning, settings } = get();
    if (!pendingMorning) return;
    void sleepRepo.save(pendingMorning);
    set((s) => ({
      sessions: [...s.sessions, pendingMorning],
      pendingMorning: null,
    }));
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

  async saveAlarm(alarm) {
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

  async importFromHealth(days) {
    const granted = await requestHealthReadAccess();
    if (!granted) return 0;
    const samples = await readHealthSleep(days);
    const fresh = sessionsFromHealth(samples, get().sessions);
    if (fresh.length === 0) return 0;
    const merged = [...get().sessions, ...fresh];
    await sleepRepo.replaceAll(merged);
    set({ sessions: merged });
    void syncSchedules(get().alarms, get().settings, merged);
    refreshWidget(merged, get().settings);
    return fresh.length;
  },

  async saveSharpness(result) {
    await sharpnessRepo.add(result);
    set((s) => ({ sharpness: [...s.sharpness, result] }));
  },
}));
