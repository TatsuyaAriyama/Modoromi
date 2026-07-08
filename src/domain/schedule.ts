import type { Lang, SleepSession } from './types';
import { dayKey } from './debt';
import { weekdayName } from './format';

/**
 * Per-day sleep window (bedtime → wake) for the rhythm chart. Times are
 * "evening minutes" — minutes since 18:00 — so windows that straddle midnight
 * stay contiguous on one axis (23:00 → 300, 07:00 → 780).
 */
export interface ScheduleDay {
  key: string;
  label: string;
  /** Bed/wake as minutes since 18:00, or null when the day has no session. */
  bedEm: number | null;
  wakeEm: number | null;
}

/** Minutes since 18:00, wrapped to [0, 1440). */
export function eveningMinute(iso: string): number {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440;
}

/**
 * Build the trailing-`days` schedule series, oldest → newest, on the same day
 * grid as the other charts. When a day has several sessions the longest one is
 * taken as the night's main sleep.
 */
export function buildScheduleSeries(
  sessions: SleepSession[],
  days: number,
  now: Date = new Date(),
  lang: Lang = 'en',
): ScheduleDay[] {
  const mainByDay = new Map<string, SleepSession>();
  for (const s of sessions) {
    const k = dayKey(new Date(s.endedAt));
    const cur = mainByDay.get(k);
    if (!cur || s.durationMin > cur.durationMin) mainByDay.set(k, s);
  }

  const out: ScheduleDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const label = days <= 7 ? weekdayName(d.getDay(), lang) : String(d.getDate());
    const s = mainByDay.get(key);
    out.push({
      key,
      label,
      bedEm: s ? eveningMinute(s.startedAt) : null,
      wakeEm: s ? eveningMinute(s.endedAt) : null,
    });
  }
  return out;
}
