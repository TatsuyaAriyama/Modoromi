/**
 * In-session alarm timing. While the session screen is foregrounded, the app
 * rings its own alarm at the set time — the reliable, loud wake that doesn't
 * depend on the OS notification surviving silent mode. Pure and deterministic.
 */

/** First wall-clock occurrence of "HH:mm" at or after `from`. */
export function nextAlarmDate(hhmm: string, from: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(from);
  t.setHours(h, m, 0, 0);
  if (t.getTime() < from.getTime()) t.setDate(t.getDate() + 1);
  return t;
}

/**
 * True once `now` has reached the alarm occurrence that follows the session
 * start. A session begun at 23:00 with a 07:00 alarm is due the next morning,
 * not immediately.
 */
export function isAlarmDue(
  hhmm: string,
  startedAt: string | Date,
  now: Date,
): boolean {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  return now.getTime() >= nextAlarmDate(hhmm, start).getTime();
}
