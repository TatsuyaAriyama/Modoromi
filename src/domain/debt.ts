import type { SleepSession } from './types';

/** Local YYYY-MM-DD key for a date. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * A session is attributed to the calendar day on which the user woke up
 * (endedAt). If multiple sessions share a wake day, their durations sum.
 */
export function sessionsByWakeDay(
  sessions: SleepSession[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.endedAt));
    map.set(key, (map.get(key) ?? 0) + s.durationMin);
  }
  return map;
}

/**
 * Sleep debt over the trailing `days` window (default 7), in minutes.
 * Returns the accumulated (target − actual) — positive means under-slept.
 *
 * Only days that have a recorded session contribute: the app cannot know
 * whether an un-logged day was a real shortfall or simply not tracked, so a
 * brand-new user shows zero debt rather than a misleading full-window deficit.
 */
export function sleepDebtMin(
  sessions: SleepSession[],
  targetMin: number,
  days = 7,
  now: Date = new Date(),
): number {
  const byDay = sessionsByWakeDay(sessions);
  let debt = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const actual = byDay.get(dayKey(d));
    if (actual === undefined) continue; // skip un-logged days
    debt += targetMin - actual;
  }
  return debt;
}

/** Most recent completed session, or undefined. */
export function lastSession(
  sessions: SleepSession[],
): SleepSession | undefined {
  if (sessions.length === 0) return undefined;
  return [...sessions].sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  )[0];
}

export type DebtStatus = 'good' | 'mild' | 'notable';

export function debtStatus(debtMin: number): DebtStatus {
  if (debtMin <= 30) return 'good';
  if (debtMin <= 180) return 'mild';
  return 'notable';
}
