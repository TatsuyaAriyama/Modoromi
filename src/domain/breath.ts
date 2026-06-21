/**
 * Paced-breathing model for the pre-sleep wind-down. "Box breathing" — equal
 * inhale, hold, exhale, hold — slows the breath and quiets a racing mind, the
 * kind of gentle ritual that helps thinking people set the day down before
 * sleep. Pure and deterministic: the UI feeds it an elapsed time and renders
 * whatever it returns.
 */

export type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

export interface BreathConfig {
  inhaleMs: number;
  holdInMs: number;
  exhaleMs: number;
  holdOutMs: number;
}

export interface BreathState {
  phase: BreathPhase;
  /** Progress through the current phase, 0..1. */
  phaseProgress: number;
  /** Orb scale, minScale..1 — small at full exhale, large at full inhale. */
  scale: number;
  /** Completed full cycles so far. */
  cycle: number;
}

/** A calm 4-4-4-4 box-breathing pace. */
export const BOX_BREATH: BreathConfig = {
  inhaleMs: 4000,
  holdInMs: 4000,
  exhaleMs: 4000,
  holdOutMs: 4000,
};

/**
 * The 4-7-8 relaxing breath — a longer hold and a long, slow exhale, with no
 * hold-out. A well-known wind-down for an overactive mind; deeper sedation
 * than the balanced box pace.
 */
export const FOUR_SEVEN_EIGHT: BreathConfig = {
  inhaleMs: 4000,
  holdInMs: 7000,
  exhaleMs: 8000,
  holdOutMs: 0,
};

/** How small the orb shrinks at full exhale (1 = full inhale). */
export const MIN_SCALE = 0.4;

/** A short ritual: this many calm breaths is a gentle, achievable target. */
export const WIND_DOWN_BREATHS = 6;

/** A selectable wind-down pace. Longer cycles get fewer, so the total stays
 *  in a similar, achievable couple of minutes. */
export interface BreathPattern {
  /** Stable id; the display label is resolved in the UI via `breath.pace.<id>`. */
  id: string;
  config: BreathConfig;
  /** How many cycles make a complete ritual for this pace. */
  breaths: number;
}

export const BREATH_PATTERNS: BreathPattern[] = [
  { id: 'box', config: BOX_BREATH, breaths: WIND_DOWN_BREATHS },
  { id: 'fourSevenEight', config: FOUR_SEVEN_EIGHT, breaths: 4 },
];

export const DEFAULT_BREATH_PATTERN = 'box';

/** Resolve a stored pattern id (tolerating unknown ids). */
export function breathPattern(id: string | undefined): BreathPattern {
  return (
    BREATH_PATTERNS.find((p) => p.id === id) ?? BREATH_PATTERNS[0]
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Resolve the breathing state at `elapsedMs` since the ritual began.
 * The cycle is inhale → hold → exhale → hold, looping.
 */
export function breathAt(
  elapsedMs: number,
  config: BreathConfig = BOX_BREATH,
): BreathState {
  const cycleMs =
    config.inhaleMs + config.holdInMs + config.exhaleMs + config.holdOutMs;
  const e = Math.max(0, elapsedMs);
  const cycle = Math.floor(e / cycleMs);
  let t = e % cycleMs;

  if (t < config.inhaleMs) {
    const p = config.inhaleMs === 0 ? 1 : t / config.inhaleMs;
    return {
      phase: 'inhale',
      phaseProgress: p,
      scale: lerp(MIN_SCALE, 1, p),
      cycle,
    };
  }
  t -= config.inhaleMs;

  if (t < config.holdInMs) {
    const p = config.holdInMs === 0 ? 1 : t / config.holdInMs;
    return { phase: 'hold-in', phaseProgress: p, scale: 1, cycle };
  }
  t -= config.holdInMs;

  if (t < config.exhaleMs) {
    const p = config.exhaleMs === 0 ? 1 : t / config.exhaleMs;
    return {
      phase: 'exhale',
      phaseProgress: p,
      scale: lerp(1, MIN_SCALE, p),
      cycle,
    };
  }
  t -= config.exhaleMs;

  const p = config.holdOutMs === 0 ? 1 : t / config.holdOutMs;
  return { phase: 'hold-out', phaseProgress: p, scale: MIN_SCALE, cycle };
}
