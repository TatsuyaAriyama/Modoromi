import type { AlarmConfig, SleepSession, UserSettings } from '../domain/types';
import { getJSON, removeKey, setJSON } from './storage';

const KEYS = {
  sessions: 'madoromi.sessions',
  alarms: 'madoromi.alarms',
  settings: 'madoromi.settings',
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  lang: 'en',
  theme: 'auto',
  targetDurationMin: 450, // 7.5h
  defaultWakeTime: '07:00',
  bedtimeReminder: false,
  onboarded: false,
  smartAlarm: false,
  smartWindowMin: 30,
  healthSync: false,
};

/**
 * Repository interfaces — keep persistence behind these so the local
 * JSON-over-Preferences impl can be swapped for SQLite later without
 * touching the store or UI.
 */
export interface SleepRepository {
  all(): Promise<SleepSession[]>;
  save(session: SleepSession): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(sessions: SleepSession[]): Promise<void>;
}

export interface AlarmRepository {
  all(): Promise<AlarmConfig[]>;
  save(alarm: AlarmConfig): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<UserSettings>;
  set(settings: UserSettings): Promise<void>;
}

class LocalSleepRepository implements SleepRepository {
  async all(): Promise<SleepSession[]> {
    return getJSON<SleepSession[]>(KEYS.sessions, []);
  }
  async save(session: SleepSession): Promise<void> {
    const list = await this.all();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = session;
    else list.push(session);
    await setJSON(KEYS.sessions, list);
  }
  async remove(id: string): Promise<void> {
    const list = (await this.all()).filter((s) => s.id !== id);
    await setJSON(KEYS.sessions, list);
  }
  async replaceAll(sessions: SleepSession[]): Promise<void> {
    await setJSON(KEYS.sessions, sessions);
  }
}

class LocalAlarmRepository implements AlarmRepository {
  async all(): Promise<AlarmConfig[]> {
    return getJSON<AlarmConfig[]>(KEYS.alarms, []);
  }
  async save(alarm: AlarmConfig): Promise<void> {
    const list = await this.all();
    const idx = list.findIndex((a) => a.id === alarm.id);
    if (idx >= 0) list[idx] = alarm;
    else list.push(alarm);
    await setJSON(KEYS.alarms, list);
  }
  async remove(id: string): Promise<void> {
    const list = (await this.all()).filter((a) => a.id !== id);
    await setJSON(KEYS.alarms, list);
  }
}

class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<UserSettings> {
    return { ...DEFAULT_SETTINGS, ...(await getJSON(KEYS.settings, {})) };
  }
  async set(settings: UserSettings): Promise<void> {
    await setJSON(KEYS.settings, settings);
  }
}

export const sleepRepo: SleepRepository = new LocalSleepRepository();
export const alarmRepo: AlarmRepository = new LocalAlarmRepository();
export const settingsRepo: SettingsRepository = new LocalSettingsRepository();

/** Full export blob for Settings → Export. */
export async function exportAll(): Promise<string> {
  const [sessions, alarms, settings] = await Promise.all([
    sleepRepo.all(),
    alarmRepo.all(),
    settingsRepo.get(),
  ]);
  return JSON.stringify(
    { app: 'Madoromi', version: 1, exportedAt: new Date().toISOString(), sessions, alarms, settings },
    null,
    2,
  );
}

/** Wipe every Madoromi key (used by Settings → delete all). */
export async function wipeAll(): Promise<void> {
  await Promise.all([removeKey(KEYS.sessions), removeKey(KEYS.alarms), removeKey(KEYS.settings)]);
}

/**
 * Overwrite stored data from a validated backup (Settings → Import). Settings
 * are merged onto the current defaults so older backups stay forward-compatible.
 */
export async function importAll(data: {
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings | null;
}): Promise<void> {
  const tasks: Promise<void>[] = [
    setJSON(KEYS.sessions, data.sessions),
    setJSON(KEYS.alarms, data.alarms),
  ];
  // Only touch settings when the backup carried a valid set; a missing or
  // corrupt settings block leaves the user's current preferences intact.
  if (data.settings) {
    tasks.push(setJSON(KEYS.settings, { ...DEFAULT_SETTINGS, ...data.settings }));
  }
  await Promise.all(tasks);
}
