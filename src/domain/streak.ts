import type { SleepSession } from './types';
import { dayKey } from './debt';

/**
 * Consecutive days with a logged night, counted backwards from today. Today
 * being unlogged doesn't break the streak (tonight's record lands tomorrow
 * morning) — it just doesn't extend it yet. A quiet motivator, not a demand.
 */
export function loggedStreakDays(
  sessions: SleepSession[],
  now: Date = new Date(),
): number {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.endedAt))));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
