import { parseHm } from './format';

function minuteOf(hm: string): number {
  const { hour, minute } = parseHm(hm);
  return hour * 60 + minute;
}

/** "HH:mm" (local) for a Date — the clock the wind-down window reasons about. */
export function toHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * True when `nowHm` falls in the half-open circular window [startHm, endHm).
 * The night-shift window normally crosses midnight (e.g. 22:00 → 07:00), so a
 * plain numeric compare won't do; this wraps around the 24h clock.
 */
export function inCircularWindow(
  nowHm: string,
  startHm: string,
  endHm: string,
): boolean {
  const n = minuteOf(nowHm);
  const s = minuteOf(startHm);
  const e = minuteOf(endHm);
  if (s === e) return false; // degenerate / empty window
  return s < e ? n >= s && n < e : n >= s || n < e;
}
