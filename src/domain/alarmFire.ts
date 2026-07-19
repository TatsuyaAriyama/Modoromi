/**
 * In-session alarm timing. While the session screen is foregrounded, the app
 * rings its own alarm at the set time — the reliable, loud wake that doesn't
 * depend on the OS notification surviving silent mode. Pure and deterministic.
 */

import type { AlarmConfig } from './types';

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

/**
 * First occurrence of an alarm at or after `from`, honouring `repeatDays`.
 * An empty `repeatDays` means one-shot — the next wall-clock occurrence —
 * matching the semantics the notification builder already uses.
 *
 * Hours are re-applied per candidate day rather than added as milliseconds,
 * so a DST shift moves the alarm with the wall clock instead of sliding it.
 */
export function nextOccurrence(a: AlarmConfig, from: Date): Date | null {
  const [h, m] = a.time.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (d.getTime() < from.getTime()) continue;
    if (a.repeatDays.length === 0 || a.repeatDays.includes(d.getDay())) return d;
  }
  return null;
}

/**
 * The enabled alarm that will actually ring soonest at or after `from`.
 *
 * Sorting alarms by their "HH:mm" string picks the earliest *time of day*,
 * which is a different alarm entirely once repeat days are involved: a
 * weekdays-only 06:30 sorts ahead of a weekend 09:00 even on a Saturday night.
 */
/**
 * Arm a one-shot alarm to a concrete instant, so the OS can schedule an
 * absolute (non-repeating) trigger for it. Repeating alarms carry no instant.
 */
export function armAlarm(a: AlarmConfig, now: Date): AlarmConfig {
  if (a.repeatDays.length === 0) {
    return { ...a, firesAt: nextAlarmDate(a.time, now).toISOString() };
  }
  if (a.firesAt === undefined) return a;
  const rest = { ...a };
  delete rest.firesAt;
  return rest;
}

/**
 * Disable one-shot alarms whose armed instant has passed. A "just tomorrow"
 * alarm should ring once and retire, not sit enabled and re-arm every night.
 */
export function expireOneShots(alarms: AlarmConfig[], now: Date): AlarmConfig[] {
  return alarms.map((a) =>
    a.enabled &&
    a.repeatDays.length === 0 &&
    a.firesAt &&
    Date.parse(a.firesAt) <= now.getTime()
      ? { ...a, enabled: false }
      : a,
  );
}

export function nextAlarmFor(
  alarms: AlarmConfig[],
  from: Date,
): { alarm: AlarmConfig; at: number } | null {
  let best: { alarm: AlarmConfig; at: number } | null = null;
  for (const a of alarms) {
    if (!a.enabled) continue;
    const at = nextOccurrence(a, from);
    if (at && (best === null || at.getTime() < best.at)) {
      best = { alarm: a, at: at.getTime() };
    }
  }
  return best;
}
