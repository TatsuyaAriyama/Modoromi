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
 * Minutes from `now` until this alarm next fires, honouring its repeat
 * weekdays (0=Sun..6=Sat; empty = one-shot, next occurrence). Pure — drives
 * the quiet "in 7h 30m" note on the alarm list.
 */
export function minutesUntilAlarm(
  hhmm: string,
  repeatDays: number[],
  now: Date,
): number {
  const [h, m] = hhmm.split(':').map(Number);
  // Scan up to 8 days: enough to reach any single repeat weekday.
  for (let d = 0; d < 8; d++) {
    const cand = new Date(now);
    cand.setDate(now.getDate() + d);
    cand.setHours(h || 0, m || 0, 0, 0);
    if (cand.getTime() <= now.getTime()) continue;
    if (repeatDays.length === 0 || repeatDays.includes(cand.getDay())) {
      return Math.round((cand.getTime() - now.getTime()) / 60000);
    }
  }
  return 0;
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
