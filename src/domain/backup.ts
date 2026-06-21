import type {
  AlarmConfig,
  Lang,
  Mood,
  Movement,
  SleepSession,
  ThemePref,
  UserSettings,
} from './types';
import type { SharpnessResult } from './sharpness';

/**
 * Validated payload from a backup file. Restoring months of sleep records is
 * destructive and irreversible, so the parser is deliberately strict: a
 * malformed file is rejected whole rather than partially applied.
 */
export interface BackupData {
  /** Schema version the payload was migrated up to (always BACKUP_VERSION). */
  version: number;
  sessions: SleepSession[];
  alarms: AlarmConfig[];
  settings: UserSettings | null;
  /** Sharpness-check results; empty when the backup predates the feature. */
  sharpness: SharpnessResult[];
}

/**
 * Current backup schema version. Bump this whenever the on-disk shape changes
 * in a way that needs a migration, and add a step to `MIGRATIONS`.
 */
export const BACKUP_VERSION = 1;

/** Stable, language-agnostic reasons a backup file was rejected. */
export type BackupError =
  | 'invalid-json'
  | 'not-object'
  | 'not-madoromi'
  | 'unsupported-version'
  | 'sessions-corrupt'
  | 'sessions-invalid'
  | 'alarms-corrupt'
  | 'alarms-invalid';

export type BackupParseResult =
  | { ok: true; data: BackupData }
  | { ok: false; error: BackupError };

const MOODS: Mood[] = ['fresh', 'normal', 'groggy'];
const THEMES: ThemePref[] = ['auto', 'day', 'night'];
const LANGS: Lang[] = ['en', 'ja'];

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
  if (x.smartWoke !== undefined && !isBool(x.smartWoke)) return false;
  if (x.imported !== undefined && !isBool(x.imported)) return false;
  if (x.motionSource !== undefined && !isStr(x.motionSource)) return false;
  if (
    x.movements !== undefined &&
    !(Array.isArray(x.movements) && x.movements.every(isMovement))
  ) {
    return false;
  }
  return true;
}

function isSharpnessResult(x: unknown): x is SharpnessResult {
  return (
    isObject(x) &&
    isStr(x.id) &&
    isStr(x.takenAt) &&
    isNum(x.medianMs) &&
    isNum(x.bestMs) &&
    isNum(x.trials) &&
    isNum(x.score)
  );
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
    lang: LANGS.includes(x.lang as Lang) ? (x.lang as Lang) : 'en',
    theme: x.theme as ThemePref,
    targetDurationMin: x.targetDurationMin,
    defaultWakeTime: x.defaultWakeTime,
    bedtimeReminder: isBool(x.bedtimeReminder) ? x.bedtimeReminder : false,
    weeklyReview: isBool(x.weeklyReview) ? x.weeklyReview : false,
    onboarded: isBool(x.onboarded) ? x.onboarded : true,
    smartAlarm: isBool(x.smartAlarm) ? x.smartAlarm : false,
    smartWindowMin: isNum(x.smartWindowMin) ? x.smartWindowMin : 30,
    healthSync: isBool(x.healthSync) ? x.healthSync : false,
  };
}

/**
 * A single forward migration step: it receives the backup object already at
 * version `from` and returns it reshaped to version `from + 1`. Steps are pure
 * and run in sequence, so each only has to worry about one version bump.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered migration steps, indexed by source version: MIGRATIONS[0] takes a
 * pre-versioning (v0) export up to v1, MIGRATIONS[1] would take v1 → v2, and so
 * on. The v0 → v1 step is structural-identity — the v1 schema is a superset of
 * the original, and the field validators already tolerate the optional fields
 * that older exports omit — but it gives every future bump a tested home.
 */
const MIGRATIONS: Migration[] = [
  // v0 → v1: original exports lacked a `version` field; nothing else changed.
  (raw) => raw,
];

/**
 * Bring a parsed backup object up to BACKUP_VERSION by running each migration
 * step in turn. A version-less export is treated as the pre-versioning v0.
 * Returns null when the file declares a version newer than this build can read.
 */
function migrate(
  raw: Record<string, unknown>,
): Record<string, unknown> | null {
  const from = isNum(raw.version) ? raw.version : 0;
  if (from > BACKUP_VERSION) return null;
  let cur = raw;
  for (let v = from; v < BACKUP_VERSION; v++) {
    cur = MIGRATIONS[v](cur);
  }
  return cur;
}

/**
 * Parse and validate a backup JSON string produced by `exportAll`.
 * Pure — no I/O. Callers persist `data` only when `ok` is true.
 */
export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  if (!isObject(parsed)) {
    return { ok: false, error: 'not-object' };
  }
  if (parsed.app !== undefined && parsed.app !== 'Madoromi') {
    return { ok: false, error: 'not-madoromi' };
  }

  const raw = migrate(parsed);
  if (raw === null) {
    return { ok: false, error: 'unsupported-version' };
  }

  if (raw.sessions !== undefined && !Array.isArray(raw.sessions)) {
    return { ok: false, error: 'sessions-corrupt' };
  }
  const sessionsRaw = (raw.sessions ?? []) as unknown[];
  if (!sessionsRaw.every(isSleepSession)) {
    return { ok: false, error: 'sessions-invalid' };
  }

  if (raw.alarms !== undefined && !Array.isArray(raw.alarms)) {
    return { ok: false, error: 'alarms-corrupt' };
  }
  const alarmsRaw = (raw.alarms ?? []) as unknown[];
  if (!alarmsRaw.every(isAlarm)) {
    return { ok: false, error: 'alarms-invalid' };
  }

  // Sharpness is a newer, lower-stakes collection: tolerate it being absent and
  // keep only well-formed entries rather than rejecting the whole restore.
  const sharpness = Array.isArray(raw.sharpness)
    ? (raw.sharpness as unknown[]).filter(isSharpnessResult)
    : [];

  return {
    ok: true,
    data: {
      version: BACKUP_VERSION,
      sessions: sessionsRaw as SleepSession[],
      alarms: alarmsRaw as AlarmConfig[],
      settings: parseSettings(raw.settings),
      sharpness,
    },
  };
}
