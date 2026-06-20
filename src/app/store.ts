import { create } from 'zustand';
import type {
  AlarmConfig,
  Mood,
  Movement,
  SleepSession,
  UserSettings,
} from '../domain/types';
import { computeQualityScore } from '../domain/score';
import {
  DEFAULT_SETTINGS,
  alarmRepo,
  settingsRepo,
  sleepRepo,
} from '../data/repositories';
import { uid } from '../lib/id';
import { syncSchedules } from '../lib/notifications';

export type ActiveSession = {
  id: string;
  startedAt: string;
} | null;

interface AppState {
  loaded: boolean;
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings;

  /** In-progress sleep session (null when awake). */
  active: ActiveSession;
  /** Session awaiting the morning check (set after waking). */
  pendingMorning: SleepSession | null;

  init(): Promise<void>;

  startSession(): void;
  endSession(movements?: Movement[]): void;
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
}

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  sessions: [],
  alarms: [],
  settings: DEFAULT_SETTINGS,
  active: null,
  pendingMorning: null,

  async init() {
    const [sessions, alarms, settings] = await Promise.all([
      sleepRepo.all(),
      alarmRepo.all(),
      settingsRepo.get(),
    ]);
    set({ sessions, alarms, settings, loaded: true });
    void syncSchedules(alarms, settings, sessions);
  },

  startSession() {
    set({ active: { id: uid(), startedAt: new Date().toISOString() } });
  },

  endSession(movements) {
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
    void syncSchedules(get().alarms, settings, get().sessions);
  },

  dismissMorning() {
    // Persist the duration-only session even if the user skips the check.
    const { pendingMorning } = get();
    if (!pendingMorning) return;
    void sleepRepo.save(pendingMorning);
    set((s) => ({
      sessions: [...s.sessions, pendingMorning],
      pendingMorning: null,
    }));
    void syncSchedules(get().alarms, get().settings, get().sessions);
  },

  async updateSession(session) {
    await sleepRepo.save(session);
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? session : x)),
    }));
    void syncSchedules(get().alarms, get().settings, get().sessions);
  },

  async deleteSession(id) {
    await sleepRepo.remove(id);
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    void syncSchedules(get().alarms, get().settings, get().sessions);
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
  },

  async replaceSessions(sessions) {
    await sleepRepo.replaceAll(sessions);
    set({ sessions });
    void syncSchedules(get().alarms, get().settings, sessions);
  },
}));
