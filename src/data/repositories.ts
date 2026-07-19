import type { AlarmConfig, SleepSession, UserSettings } from '../domain/types';
import {
  getJSON,
  purgeQuarantine,
  readChecked,
  removeKey,
  setJSON,
  type FaultReason,
  type ParseOutcome,
} from './storage';
import { enqueue } from './keyQueue';
import { isAlarm, isSleepSession } from '../domain/backup';

/* ── Data faults ─────────────────────────────────────────────────────────
   A read that could not be trusted, recorded for this launch only. There is
   deliberately NO persisted fault index and NO write lock: quarantining the
   blob already prevents the permanent loss, whereas refusing later writes
   would create a NEW one — every night recorded between the bad read and the
   user noticing would be thrown away. */

export type DataKey = 'sessions' | 'alarms';

export interface DataFault {
  key: DataKey;
  reason: FaultReason;
  /** Entries individually invalid and left out; 0 when the whole blob failed. */
  dropped: number;
}

let faults: DataFault[] = [];

/** Faults recorded since launch. The originals are in quarantine storage. */
export function dataFaults(): DataFault[] {
  return faults;
}

export function clearFaults(): void {
  faults = [];
}

/** Keep the entries we understand and count the ones we do not. Rejecting a
 *  whole log because one night is malformed would throw away months. */
function arrayOf<T>(guard: (x: unknown) => x is T) {
  return (raw: unknown): ParseOutcome<T[]> => {
    if (!Array.isArray(raw)) return { ok: false };
    const value = raw.filter(guard);
    return { ok: true, value, dropped: raw.length - value.length };
  };
}

async function readList<T>(
  key: string,
  faultKey: DataKey,
  guard: (x: unknown) => x is T,
): Promise<T[]> {
  const r = await readChecked<T[]>(key, arrayOf(guard), []);
  if (!r.ok) {
    faults = [...faults.filter((f) => f.key !== faultKey), { key: faultKey, reason: r.reason, dropped: 0 }];
    return [];
  }
  if (r.dropped > 0) {
    faults = [
      ...faults.filter((f) => f.key !== faultKey),
      { key: faultKey, reason: 'partial', dropped: r.dropped },
    ];
  }
  return r.value;
}

const KEYS = {
  sessions: 'madoromi.sessions',
  alarms: 'madoromi.alarms',
  settings: 'madoromi.settings',
  runtime: 'madoromi.runtime',
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  lang: 'en',
  theme: 'auto',
  clockPref: 'auto',
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

/**
 * Transient across-launch state: the night currently being slept, and a night
 * waiting for its morning check. A sleep session spans 6–9 hours of the app
 * sitting in the background — precisely when the OS reclaims the WebView — so
 * holding this only in memory means a reclaim silently eats the whole night.
 */
export interface RuntimeState {
  active: { id: string; startedAt: string } | null;
  pendingMorning: SleepSession | null;
}

export interface RuntimeRepository {
  get(): Promise<RuntimeState>;
  set(state: RuntimeState): Promise<void>;
}

/* Mutations run on the key's FIFO chain, so two saves in the same tick cannot
   both read the pre-change list. Reads stay UNqueued: a read is a single atomic
   load, and queueing one would deadlock the RMW bodies, which read while
   holding the key — hence getJSON directly below rather than this.all(). */
class LocalSleepRepository implements SleepRepository {
  async all(): Promise<SleepSession[]> {
    return readList(KEYS.sessions, 'sessions', isSleepSession);
  }
  save(session: SleepSession): Promise<void> {
    return enqueue(KEYS.sessions, async () => {
      const list = await getJSON<SleepSession[]>(KEYS.sessions, []);
      const idx = list.findIndex((s) => s.id === session.id);
      if (idx >= 0) list[idx] = session;
      else list.push(session);
      await setJSON(KEYS.sessions, list);
    });
  }
  remove(id: string): Promise<void> {
    return enqueue(KEYS.sessions, async () => {
      const list = (await getJSON<SleepSession[]>(KEYS.sessions, [])).filter(
        (s) => s.id !== id,
      );
      await setJSON(KEYS.sessions, list);
    });
  }
  replaceAll(sessions: SleepSession[]): Promise<void> {
    return enqueue(KEYS.sessions, () => setJSON(KEYS.sessions, sessions));
  }
}

class LocalAlarmRepository implements AlarmRepository {
  async all(): Promise<AlarmConfig[]> {
    return readList(KEYS.alarms, 'alarms', isAlarm);
  }
  save(alarm: AlarmConfig): Promise<void> {
    return enqueue(KEYS.alarms, async () => {
      const list = await getJSON<AlarmConfig[]>(KEYS.alarms, []);
      const idx = list.findIndex((a) => a.id === alarm.id);
      if (idx >= 0) list[idx] = alarm;
      else list.push(alarm);
      await setJSON(KEYS.alarms, list);
    });
  }
  remove(id: string): Promise<void> {
    return enqueue(KEYS.alarms, async () => {
      const list = (await getJSON<AlarmConfig[]>(KEYS.alarms, [])).filter(
        (a) => a.id !== id,
      );
      await setJSON(KEYS.alarms, list);
    });
  }
}

class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<UserSettings> {
    return { ...DEFAULT_SETTINGS, ...(await getJSON(KEYS.settings, {})) };
  }
  set(settings: UserSettings): Promise<void> {
    // A blind write, but still queued so last-caller-wins is deterministic.
    return enqueue(KEYS.settings, () => setJSON(KEYS.settings, settings));
  }
}

class LocalRuntimeRepository implements RuntimeRepository {
  async get(): Promise<RuntimeState> {
    const raw = await getJSON<Partial<RuntimeState>>(KEYS.runtime, {});
    // Validate on the way in: a half-written or older blob must degrade to
    // "no night in progress" rather than crash the launch.
    const a = raw.active;
    const active =
      a && typeof a.id === 'string' && !Number.isNaN(Date.parse(a.startedAt))
        ? { id: a.id, startedAt: a.startedAt }
        : null;
    const p = raw.pendingMorning;
    const pendingMorning =
      p && typeof p.id === 'string' && Number.isFinite(p.durationMin) ? p : null;
    return { active, pendingMorning };
  }
  set(state: RuntimeState): Promise<void> {
    return enqueue(KEYS.runtime, () => setJSON(KEYS.runtime, state));
  }
}

export const sleepRepo: SleepRepository = new LocalSleepRepository();
export const alarmRepo: AlarmRepository = new LocalAlarmRepository();
export const settingsRepo: SettingsRepository = new LocalSettingsRepository();
export const runtimeRepo: RuntimeRepository = new LocalRuntimeRepository();

const BULK = 'madoromi.bulk';
const ALL_KEYS: string[] = Object.values(KEYS);

/**
 * Run `task` while holding every key's chain, so a bulk read or write always
 * corresponds to a state the app was actually in — an export must never
 * capture new sessions alongside old alarms.
 *
 * Bulk operations are serialized on their own chain first, so two of them can
 * never each hold a subset of the keys and deadlock. Ordinary writes never
 * wait on the bulk chain, so there is no cycle in the other direction.
 */
function withAllKeys<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(BULK, () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const acquired: Promise<void>[] = [];
    for (const k of ALL_KEYS) {
      let held!: () => void;
      acquired.push(
        new Promise<void>((r) => {
          held = r;
        }),
      );
      void enqueue(k, () => {
        held();
        return gate;
      });
    }
    return Promise.all(acquired)
      .then(task)
      .then(
        (v) => {
          release();
          return v;
        },
        (e: unknown) => {
          release();
          throw e;
        },
      );
  });
}

/** Full export blob for Settings → Export. */
export function exportAll(): Promise<string> {
  return withAllKeys(exportAllImpl);
}

async function exportAllImpl(): Promise<string> {
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
export function wipeAll(): Promise<void> {
  return withAllKeys(wipeAllImpl);
}

async function wipeAllImpl(): Promise<void> {
  clearFaults();
  await purgeQuarantine();
  await Promise.all([
    removeKey(KEYS.sessions),
    removeKey(KEYS.alarms),
    removeKey(KEYS.settings),
    removeKey(KEYS.runtime),
  ]);
}

/**
 * Overwrite stored data from a validated backup (Settings → Import). Settings
 * are merged onto the current defaults so older backups stay forward-compatible.
 */
export function importAll(data: {
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings | null;
}): Promise<void> {
  return withAllKeys(() => importAllImpl(data));
}

async function importAllImpl(data: {
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings | null;
}): Promise<void> {
  // A validated restore is the remedy for a fault; stop reporting it.
  clearFaults();
  const tasks: Promise<void>[] = [
    setJSON(KEYS.sessions, data.sessions),
    setJSON(KEYS.alarms, data.alarms),
    // An import replaces the world; any night the old install thought was in
    // progress belongs to data that no longer exists.
    setJSON(KEYS.runtime, { active: null, pendingMorning: null }),
  ];
  // Only touch settings when the backup carried a valid set; a missing or
  // corrupt settings block leaves the user's current preferences intact.
  if (data.settings) {
    tasks.push(setJSON(KEYS.settings, { ...DEFAULT_SETTINGS, ...data.settings }));
  }
  await Promise.all(tasks);
}
