import { registerPlugin } from '@capacitor/core';
import type { SleepSession } from '../domain/types';
import { isNative } from './platform';

/**
 * Apple Health (HealthKit) sleep mirroring.
 *
 * Madoromi stores its own sleep log locally; this is an *opt-in* one-way mirror
 * so the user's confirmed nights also appear in the Health app's Sleep section
 * (HKCategoryTypeSleepAnalysis, value `inBed`). It never reads back from Health
 * — the local log stays the source of truth — and every call is best-effort:
 * off-device (web/Android) it is a no-op, and a denied/failed write is swallowed
 * so the morning flow never blocks on it.
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
