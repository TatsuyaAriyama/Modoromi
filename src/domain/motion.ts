import type { Movement, MotionMode } from './types';

export type { MotionMode };

/**
 * Gravity-excluded acceleration peak (m/s²) above which a sample counts as a
 * body movement. Sleep accelerometer noise sits well below this; rolling over
 * or sitting up easily exceeds it.
 */
export const MOVE_THRESHOLD = 1.2;

/** Movements-per-hour at which sleep is considered fully restless (stability 0). */
export const RESTLESS_PER_HOUR = 24;

/** Euclidean magnitude of a 3-axis acceleration sample. */
export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Did a sensor actually capture this session? A native background recording
 * always counts; the foreground JS path only counts if samples arrived. When
 * nothing was captured the night is *untracked* — the caller should omit the
 * movements field rather than store an empty array, so a phone left on the
 * nightstand (or a denied permission) isn't credited as a perfectly still
 * night and doesn't inflate the quality score.
 */
export function isMotionTracked(mode: MotionMode, sampleCount: number): boolean {
  if (mode === 'native') return true;
  if (mode === 'js') return sampleCount > 0;
  return false;
}

/**
 * Was this night captured with the screen off? Only the native background
 * recorder keeps sampling once the screen locks; the foreground JS path stops
 * there. Drives the honest per-night note in the log so the user can verify
 * that background tracking actually ran on their device.
 */
export function capturedScreenOff(source: MotionMode | undefined): boolean {
  return source === 'native';
}

/** Movements per hour over the session. */
export function movementsPerHour(count: number, durationMin: number): number {
  if (durationMin <= 0) return 0;
  return count / (durationMin / 60);
}

/**
 * 0–1 body-movement stability term for the quality score. A still night
 * scores 1; a restless one trends toward 0. Linear in movement density,
 * clamped at RESTLESS_PER_HOUR.
 */
export function stabilityScore(count: number, durationMin: number): number {
  const perHour = movementsPerHour(count, durationMin);
  const s = 1 - perHour / RESTLESS_PER_HOUR;
  return Math.min(1, Math.max(0, s));
}

export type RestlessnessLevel = 'still' | 'calm' | 'restless';

/**
 * Upper bounds (movements per hour) for the gentle three-step restlessness
 * label. At or below `still` reads as a very still night; at or below `calm`
 * as settled; anything above as restless.
 */
export const RESTLESS_LEVELS = {
  still: 3,
  calm: 10,
} as const;

/**
 * Classify a night's movement density into a soft, non-clinical label.
 * A "目安", never a verdict — the copy stays gentle on purpose.
 */
export function restlessnessLevel(
  count: number,
  durationMin: number,
): RestlessnessLevel {
  const perHour = movementsPerHour(count, durationMin);
  if (perHour <= RESTLESS_LEVELS.still) return 'still';
  if (perHour <= RESTLESS_LEVELS.calm) return 'calm';
  return 'restless';
}

/**
 * Bucket movements into `bins` equal time slices across the night (oldest →
 * newest), returning a count per slice for a small sparkline. Movements
 * outside [0, durationMin] are clamped into the nearest edge bin. Returns a
 * zero-filled array when there is no usable data.
 */
export function movementHistogram(
  movements: Movement[],
  durationMin: number,
  bins = 12,
): number[] {
  const size = Math.max(1, Math.floor(bins));
  const out = new Array<number>(size).fill(0);
  if (durationMin <= 0 || movements.length === 0) return out;
  for (const m of movements) {
    const frac = Math.min(1, Math.max(0, m.t / durationMin));
    const idx = Math.min(size - 1, Math.floor(frac * size));
    out[idx] += 1;
  }
  return out;
}

/**
 * Smart-wake decision, evaluated each tick while the session screen is
 * foregrounded. Returns true when the user should be woken now.
 *
 * - Before the window opens: never.
 * - Inside the window: wake if recent movement suggests light sleep.
 * - At/after the alarm time: always (the hard alarm boundary).
 */
export function shouldSmartWake(opts: {
  movements: Movement[];
  elapsedMin: number;
  minutesToAlarm: number;
  windowMin: number;
}): boolean {
  const { movements, elapsedMin, minutesToAlarm, windowMin } = opts;
  if (minutesToAlarm <= 0) return true;
  if (minutesToAlarm > windowMin) return false;
  // Light-sleep heuristic: at least two movements in the last ~3 minutes.
  const recent = movements.filter((m) => m.t >= elapsedMin - 3);
  return recent.length >= 2;
}
