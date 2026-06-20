import type { Mood, SleepSession } from './types';

/**
 * Weight constants. Phase 2 will add a third (body-movement stability) term;
 * keeping these as named constants so the weights stay easy to rebalance
 * without a breaking change to the data model.
 */
export const SCORE_WEIGHTS = {
  duration: 0.6,
  mood: 0.4,
} as const;

export const MOOD_VALUE: Record<Mood, number> = {
  fresh: 1.0,
  normal: 0.6,
  groggy: 0.3,
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 0–1: how close the actual duration is to the target. */
export function durationScore(durationMin: number, targetMin: number): number {
  if (targetMin <= 0) return 0;
  return clamp(1 - Math.abs(durationMin - targetMin) / targetMin, 0, 1);
}

export function moodScore(mood: Mood | undefined): number {
  return mood ? MOOD_VALUE[mood] : MOOD_VALUE.normal;
}

/**
 * Quality score 0–100. Requires a mood (morning check) to be meaningful —
 * callers should treat the score as unconfirmed until mood is present.
 */
export function computeQualityScore(
  durationMin: number,
  mood: Mood,
  targetMin: number,
): number {
  const ds = durationScore(durationMin, targetMin);
  const ms = MOOD_VALUE[mood];
  return Math.round((ds * SCORE_WEIGHTS.duration + ms * SCORE_WEIGHTS.mood) * 100);
}

/** True once the morning check has been filled in. */
export function isQualityConfirmed(s: SleepSession): boolean {
  return s.mood !== undefined && s.qualityScore !== undefined;
}
