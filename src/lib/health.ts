import { registerPlugin } from '@capacitor/core';
import type { SleepSession } from '../domain/types';
import type { HealthSleepSample } from '../domain/healthImport';
import { isNative } from './platform';

/**
 * Apple Health (HealthKit) sleep bridge.
 *
 * Madoromi keeps its own local sleep log as the source of truth. Two opt-in,
 * independent integrations sit on top:
 *  - Write mirror: confirmed nights also appear in the Health app's Sleep
 *    section (HKCategoryTypeSleepAnalysis, `inBed`).
 *  - Read import: nights tracked elsewhere (a watch, another app) can be pulled
 *    in on demand. Imported nights are clustered and de-duplicated against the
 *    local log so import is idempotent (see `domain/healthImport`).
 *
 * Every call is best-effort: off-device (web/Android) it is a no-op, and a
 * denied/failed operation is swallowed so app flows never block on Health.
 *
 * The native half is a small custom Capacitor plugin (`Health`, Swift). Until
 * that target is wired in Xcode, `registerPlugin` resolves to a stub whose calls
 * reject; the wrappers below absorb that, so the JS app behaves identically.
 */

export interface HealthPlugin {
  /** Whether HealthKit exists and sleep writing is permitted on this device. */
  isAvailable(): Promise<{ available: boolean }>;
  /** Prompt for write access to sleep analysis. Resolves to the grant result. */
  requestAuthorization(): Promise<{ granted: boolean }>;
  /** Write one in-bed sleep sample spanning [startISO, endISO). */
  saveSleep(sample: SleepSample): Promise<void>;
  /** Prompt for read access to sleep analysis. Resolves to the prompt result. */
  requestReadAuthorization(): Promise<{ granted: boolean }>;
  /** Read raw sleep samples overlapping [startISO, endISO). */
  readSleep(range: {
    startISO: string;
    endISO: string;
  }): Promise<{ samples: HealthSleepSample[] }>;
}

/** The minimal payload a sleep sample needs: an ISO start and end instant. */
export interface SleepSample {
  startISO: string;
  endISO: string;
}

const Health = registerPlugin<HealthPlugin>('Health');

/**
 * Pure: derive the HealthKit sample window for a session. Prefers the recorded
 * timestamps; falls back to deriving the start from `durationMin` when the
 * stored start is missing or after the end (defensive — a sample must not have
 * a non-positive span). Returns null when no valid window can be formed.
 */
export function sleepSampleFor(session: SleepSession): SleepSample | null {
  const end = new Date(session.endedAt).getTime();
  if (Number.isNaN(end)) return null;
  let start = new Date(session.startedAt).getTime();
  if (Number.isNaN(start) || start >= end) {
    if (!(session.durationMin > 0)) return null;
    start = end - session.durationMin * 60000;
  }
  return {
    startISO: new Date(start).toISOString(),
    endISO: new Date(end).toISOString(),
  };
}

/** True only on a device where HealthKit reports sleep writing is available. */
export async function healthAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { available } = await Health.isAvailable();
    return available;
  } catch {
    return false;
  }
}

/** Prompt for HealthKit write access. Resolves false when unavailable/denied. */
export async function requestHealthAccess(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { granted } = await Health.requestAuthorization();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Mirror one confirmed session into Apple Health. No-op when sync is off,
 * off-device, or the session can't form a valid window. Best-effort: any
 * failure is swallowed so the caller's flow is never interrupted.
 */
export async function mirrorSleepToHealth(session: SleepSession): Promise<void> {
  if (!isNative()) return;
  const sample = sleepSampleFor(session);
  if (!sample) return;
  try {
    await Health.saveSleep(sample);
  } catch {
    /* ignore — best-effort */
  }
}

/** Prompt for HealthKit read access. Resolves false when unavailable/denied. */
export async function requestHealthReadAccess(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { granted } = await Health.requestReadAuthorization();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Read raw sleep samples from the trailing `days` days. Returns an empty list
 * off-device or on any error, so the caller can treat "nothing to import" and
 * "Health unavailable" the same way.
 */
export async function readHealthSleep(days: number): Promise<HealthSleepSample[]> {
  if (!isNative()) return [];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  try {
    const { samples } = await Health.readSleep({
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    });
    return Array.isArray(samples) ? samples : [];
  } catch {
    return [];
  }
}
