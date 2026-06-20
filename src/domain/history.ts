import type { SleepSession } from './types';
import { dayKey, sessionsByWakeDay } from './debt';
import { weekdayJa } from './format';

export interface DaySeries {
  key: string;
  label: string;
  durationMin: number;
  qualityScore: number | null;
}

/**
 * Build a per-day series for the trailing `days` window ending today,
 * oldest → newest. Quality is the average of confirmed scores on that day.
 */
export function buildDaySeries(
  sessions: SleepSession[],
  days: number,
  now: Date = new Date(),
): DaySeries[] {
  const byDayDuration = sessionsByWakeDay(sessions);

  // quality averages per wake day
  const qAgg = new Map<string, { sum: number; n: number }>();
  for (const s of sessions) {
    if (s.qualityScore == null) continue;
    const k = dayKey(new Date(s.endedAt));
    const cur = qAgg.get(k) ?? { sum: 0, n: 0 };
    cur.sum += s.qualityScore;
    cur.n += 1;
    qAgg.set(k, cur);
  }

  const out: DaySeries[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const q = qAgg.get(key);
    out.push({
      key,
      label:
        days <= 7 ? weekdayJa(d.getDay()) : String(d.getDate()),
      durationMin: byDayDuration.get(key) ?? 0,
      qualityScore: q ? Math.round(q.sum / q.n) : null,
    });
  }
  return out;
}

export function averageDuration(series: DaySeries[]): number {
  const withData = series.filter((s) => s.durationMin > 0);
  if (withData.length === 0) return 0;
  return Math.round(
    withData.reduce((a, s) => a + s.durationMin, 0) / withData.length,
  );
}

export function averageQuality(series: DaySeries[]): number | null {
  const withData = series.filter((s) => s.qualityScore != null);
  if (withData.length === 0) return null;
  return Math.round(
    withData.reduce((a, s) => a + (s.qualityScore ?? 0), 0) / withData.length,
  );
}
