import type { SleepSession } from './types';

const DAY_MIN = 1440;

/** Local minute-of-day (0–1439) for an ISO timestamp. */
export function minuteOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Circular standard deviation (in minutes) of clock times on a 24h dial.
 * Clock times wrap at midnight, so a plain stddev would wildly overstate the
 * spread of e.g. 23:50 and 00:10. This uses the Mardia circular dispersion:
 * map each time to an angle, take the mean resultant length R, then
 * std = sqrt(-2 ln R) converted back to minutes.
 *
 * Returns 0 for fewer than two samples.
 */
export function circularStdMinutes(values: number[]): number {
  if (values.length < 2) return 0;
  let sumSin = 0;
  let sumCos = 0;
  for (const v of values) {
    const a = (v / DAY_MIN) * 2 * Math.PI;
    sumSin += Math.sin(a);
    sumCos += Math.cos(a);
  }
  const n = values.length;
  // Clamp to [0,1]: rounding can nudge the resultant length just past 1 for
  // identical times, which would make log(r) > 0 and the sqrt NaN.
  const r = Math.min(1, Math.sqrt(sumSin * sumSin + sumCos * sumCos) / n);
  if (r <= 0) return DAY_MIN / 4; // maximally dispersed
  const stdRad = Math.sqrt(-2 * Math.log(r));
  const std = (stdRad / (2 * Math.PI)) * DAY_MIN;
  return std === 0 ? 0 : std; // normalise -0 from sqrt(-0)
}

/** Minutes of circular spread that maps regularity to 0. */
export const REGULARITY_FLOOR_MIN = 90;

/**
 * Sleep regularity over the trailing `days` window, 0–1 (1 = perfectly
 * regular). Averages the dispersion of bedtimes and wake times. Returns null
 * until at least two sessions exist to compare.
 */
export function consistencyScore(
  sessions: SleepSession[],
  days = 7,
  now: Date = new Date(),
): number | null {
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  const recent = sessions.filter((s) => new Date(s.endedAt) >= cutoff);
  if (recent.length < 2) return null;

  const beds = recent.map((s) => minuteOfDay(s.startedAt));
  const wakes = recent.map((s) => minuteOfDay(s.endedAt));
  const avgStd =
    (circularStdMinutes(beds) + circularStdMinutes(wakes)) / 2;

  return Math.min(1, Math.max(0, 1 - avgStd / REGULARITY_FLOOR_MIN));
}

export type RegularityLevel = 'high' | 'medium' | 'low';

export function regularityLevel(score: number): RegularityLevel {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}
