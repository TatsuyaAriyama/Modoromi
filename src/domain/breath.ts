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

/** How small the orb shrinks at full exhale (1 = full inhale). */
export const MIN_SCALE = 0.4;

/** A short ritual: this many calm breaths is a gentle, achievable target. */
export const WIND_DOWN_BREATHS = 6;

/** Short Japanese cue for each phase. */
export const PHASE_LABEL: Record<BreathPhase, string> = {
  inhale: '吸って',
  'hold-in': '止めて',
  exhale: '吐いて',
  'hold-out': '止めて',
};

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
