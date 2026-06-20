import type {
  AlarmConfig,
  Mood,
  Movement,
  SleepSession,
  ThemePref,
  UserSettings,
} from './types';

/**
 * Validated payload from a backup file. Restoring months of sleep records is
 * destructive and irreversible, so the parser is deliberately strict: a
 * malformed file is rejected whole rather than partially applied.
 */
export interface BackupData {
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings | null;
}

export type BackupParseResult =
  | { ok: true; data: BackupData }
  | { ok: false; error: string };

const MOODS: Mood[] = ['fresh', 'normal', 'groggy'];
const THEMES: ThemePref[] = ['auto', 'day', 'night'];

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
function isStr(x: unknown): x is string {
  return typeof x === 'string';
}
function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}
function isBool(x: unknown): x is boolean {
  return typeof x === 'boolean';
}

function isMovement(x: unknown): x is Movement {
  return isObject(x) && isNum(x.t) && isNum(x.magnitude);
}

function isSleepSession(x: unknown): x is SleepSession {
  if (!isObject(x)) return false;
  if (!isStr(x.id) || !isStr(x.startedAt) || !isStr(x.endedAt)) return false;
  if (!isNum(x.durationMin)) return false;
  if (x.mood !== undefined && !MOODS.includes(x.mood as Mood)) return false;
  if (x.subjective !== undefined && !isNum(x.subjective)) return false;
  if (x.note !== undefined && !isStr(x.note)) return false;
  if (x.theme !== undefined && !isStr(x.theme)) return false;
  if (x.qualityScore !== undefined && !isNum(x.qualityScore)) return false;
  if (
    x.movements !== undefined &&
    !(Array.isArray(x.movements) && x.movements.every(isMovement))
  ) {
    return false;
  }
  return true;
}

function isAlarm(x: unknown): x is AlarmConfig {
  return (
    isObject(x) &&
    isStr(x.id) &&
    isStr(x.time) &&
    Array.isArray(x.repeatDays) &&
    x.repeatDays.every(isNum) &&
    isStr(x.sound) &&
    isBool(x.snoozeEnabled) &&
    isNum(x.snoozeMinutes) &&
    isBool(x.enabled)
  );
}

/**
 * Build a normalized UserSettings, tolerating older backups that predate a
 * field. Returns null if the core fields are missing or wrong-typed.
 */
function parseSettings(x: unknown): UserSettings | null {
  if (!isObject(x)) return null;
  if (!THEMES.includes(x.theme as ThemePref)) return null;
  if (!isNum(x.targetDurationMin)) return null;
  if (!isStr(x.defaultWakeTime)) return null;
  return {
    theme: x.theme as ThemePref,
    targetDurationMin: x.targetDurationMin,
    defaultWakeTime: x.defaultWakeTime,
    bedtimeReminder: isBool(x.bedtimeReminder) ? x.bedtimeReminder : false,
    onboarded: isBool(x.onboarded) ? x.onboarded : true,
    smartAlarm: isBool(x.smartAlarm) ? x.smartAlarm : false,
  };
}

/**
 * Parse and validate a backup JSON string produced by `exportAll`.
 * Pure — no I/O. Callers persist `data` only when `ok` is true.
 */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONとして読み取れませんでした' };
  }
  if (!isObject(raw)) {
    return { ok: false, error: 'バックアップの形式ではありません' };
  }
  if (raw.app !== undefined && raw.app !== 'Madoromi') {
    return { ok: false, error: 'Madoromiのバックアップではありません' };
  }

  if (raw.sessions !== undefined && !Array.isArray(raw.sessions)) {
    return { ok: false, error: '記録データが壊れています' };
  }
  const sessionsRaw = (raw.sessions ?? []) as unknown[];
  if (!sessionsRaw.every(isSleepSession)) {
    return { ok: false, error: '記録データに不正な項目があります' };
  }

  if (raw.alarms !== undefined && !Array.isArray(raw.alarms)) {
    return { ok: false, error: 'アラームデータが壊れています' };
  }
  const alarmsRaw = (raw.alarms ?? []) as unknown[];
  if (!alarmsRaw.every(isAlarm)) {
    return { ok: false, error: 'アラームデータに不正な項目があります' };
  }

  return {
    ok: true,
    data: {
      sessions: sessionsRaw as SleepSession[],
      alarms: alarmsRaw as AlarmConfig[],
      settings: parseSettings(raw.settings),
    },
  };
}
