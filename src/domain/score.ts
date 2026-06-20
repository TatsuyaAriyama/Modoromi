import type { Mood, Movement, SleepSession } from './types';
import { stabilityScore } from './motion';

/**
 * Weight constants, kept named so the balance stays easy to tune.
 *
 * SCORE_WEIGHTS applies when no motion data is available (browser, permission
 * denied). SCORE_WEIGHTS_3 applies when body movement was tracked, folding in
 * the stability term and rebalancing duration/mood to make room for it.
 */
export const SCORE_WEIGHTS = {
  duration: 0.6,
  mood: 0.4,
} as const;

export const SCORE_WEIGHTS_3 = {
  duration: 0.5,
  mood: 0.3,
  stability: 0.2,
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
 *
 * When `movements` is provided (motion was tracked, even if empty) the
 * stability term is folded in using the 3-term weights; otherwise the
 * duration/mood split is used.
 */
export function computeQualityScore(
  durationMin: number,
  mood: Mood,
  targetMin: number,
  movements?: Movement[],
): number {
  const ds = durationScore(durationMin, targetMin);
  const ms = MOOD_VALUE[mood];
  if (movements === undefined) {
    return Math.round(
      (ds * SCORE_WEIGHTS.duration + ms * SCORE_WEIGHTS.mood) * 100,
    );
  }
  const ss = stabilityScore(movements.length, durationMin);
  return Math.round(
    (ds * SCORE_WEIGHTS_3.duration +
      ms * SCORE_WEIGHTS_3.mood +
      ss * SCORE_WEIGHTS_3.stability) *
      100,
  );
}

/** True once the morning check has been filled in. */
export function isQualityConfirmed(s: SleepSession): boolean {
  return s.mood !== undefined && s.qualityScore !== undefined;
}
