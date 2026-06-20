import type { Movement } from './types';

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
