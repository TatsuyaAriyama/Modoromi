import type { Lang } from './types';
import { dayKey } from './debt';
import { weekdayName } from './format';
import type { ConditionPoint } from './conditionSeries';

/**
 * "Sharpness check" — a short visual reaction-time test that turns the app's
 * estimated thinking condition into something *measured*. The screen lights up
 * at a random moment; how fast you tap is a rough, honest proxy for how alert
 * your mind is right now. Pure scoring and aggregation live here; the screen
 * just collects raw tap latencies and hands them over.
 */

export interface SharpnessResult {
  id: string;
  takenAt: string; // ISO
  /** Robust centre of the valid trials, in milliseconds. */
  medianMs: number;
  /** Fastest valid trial, in milliseconds. */
  bestMs: number;
  /** How many valid trials went into the result. */
  trials: number;
  /** 0–100 sharpness score derived from {@link medianMs} (faster = higher). */
  score: number;
}

/** A reaction at/under this fast bound maps to 100. */
export const SHARP_FAST_MS = 220;
/** A reaction at/over this slow bound maps to 0. */
export const SHARP_SLOW_MS = 520;
/**
 * Taps faster than this aren't human reactions to the signal — they're
 * anticipation (a lucky early tap). Dropped as invalid.
 */
export const MIN_VALID_MS = 120;
/** A complete check is this many valid trials. */
export const SHARP_TRIALS = 5;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Map a median reaction time (ms) to a 0–100 sharpness score (faster = higher). */
export function sharpnessScore(medianMs: number): number {
  const t = (SHARP_SLOW_MS - medianMs) / (SHARP_SLOW_MS - SHARP_FAST_MS);
  return Math.round(clamp01(t) * 100);
}

export type SharpnessTier = 'sharp' | 'steady' | 'foggy';

export function sharpnessTier(score: number): SharpnessTier {
  if (score >= 70) return 'sharp';
  if (score >= 40) return 'steady';
  return 'foggy';
}

/**
 * Build a result from raw tap latencies (ms). Anticipatory taps (< MIN_VALID_MS)
 * are dropped. Returns null when no valid trial remains.
 */
export function buildResult(
  rawMs: number[],
  takenAt: Date,
  id: string,
): SharpnessResult | null {
  const valid = rawMs.filter((m) => m >= MIN_VALID_MS && Number.isFinite(m));
  if (valid.length === 0) return null;
  const med = Math.round(median(valid));
  return {
    id,
    takenAt: takenAt.toISOString(),
    medianMs: med,
    bestMs: Math.round(Math.min(...valid)),
    trials: valid.length,
    score: sharpnessScore(med),
  };
}

/** Most recent result, or null. */
export function latestResult(results: SharpnessResult[]): SharpnessResult | null {
  if (results.length === 0) return null;
  return [...results].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
  )[0];
}

export interface SharpnessPoint {
  key: string;
  label: string;
  /** Average sharpness score that day, or null when no check was taken. */
  score: number | null;
}

/**
 * Per-day sharpness across the trailing `days` window, oldest → newest, aligned
 * to the same day grid as the condition trend so the two can be read together.
 * Multiple checks on one day are averaged.
 */
export function buildSharpnessSeries(
  results: SharpnessResult[],
  days: number,
  now: Date = new Date(),
  lang: Lang = 'en',
): SharpnessPoint[] {
  const byDay = new Map<string, number[]>();
  for (const r of results) {
    const k = dayKey(new Date(r.takenAt));
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r.score);
  }
  const out: SharpnessPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const label = days <= 7 ? weekdayName(d.getDay(), lang) : String(d.getDate());
    const scores = byDay.get(key);
    out.push({
      key,
      label,
      score: scores ? Math.round(mean(scores)) : null,
    });
  }
  return out;
}

export type AgreementLevel = 'aligned' | 'loose' | 'diverging';

export interface SharpnessAgreement {
  /** Number of days that had both a measured check and an estimated condition. */
  n: number;
  /** Pearson correlation between measured sharpness and estimated condition. */
  corr: number;
  level: AgreementLevel;
}

/** Days with both signals are needed before an agreement is trustworthy. */
export const MIN_AGREEMENT_DAYS = 4;

/**
 * The "answer key": how well the *measured* sharpness agrees with the
 * *estimated* thinking condition, on days that have both. Returns null until
 * there are enough paired days to mean anything. A quiet check on the app's own
 * estimate — never a grade.
 */
export function sharpnessAgreement(
  results: SharpnessResult[],
  condition: ConditionPoint[],
): SharpnessAgreement | null {
  const sharpByDay = new Map<string, number[]>();
  for (const r of results) {
    const k = dayKey(new Date(r.takenAt));
    (sharpByDay.get(k) ?? sharpByDay.set(k, []).get(k)!).push(r.score);
  }

  const xs: number[] = []; // measured sharpness
  const ys: number[] = []; // estimated condition
  for (const p of condition) {
    if (p.index == null) continue;
    const s = sharpByDay.get(p.key);
    if (!s) continue;
    xs.push(mean(s));
    ys.push(p.index);
  }
  if (xs.length < MIN_AGREEMENT_DAYS) return null;

  const corr = pearson(xs, ys);
  return {
    n: xs.length,
    corr,
    level: corr >= 0.5 ? 'aligned' : corr >= 0.2 ? 'loose' : 'diverging',
  };
}

function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}
