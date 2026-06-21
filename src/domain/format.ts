// Locale-aware text formatters live in the i18n catalog so domain and UI share
// one implementation. Re-exported here for ergonomic imports from domain code.
export {
  formatDuration,
  weekdayName,
  formatDate,
} from '../i18n/catalog';

/** Format a minute count as compact "7h30m" for charts (language-neutral). */
export function formatDurationShort(min: number): string {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

/** "HH:mm" from an ISO string (local time). */
export function isoToHm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Parse "HH:mm" to {hour, minute}, clamped to a real clock (0–23, 0–59) so a
 * malformed stored/imported value can't produce an out-of-range time. Missing
 * or non-numeric pieces default to 0.
 */
export function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(':').map(Number);
  const clamp = (n: number, hi: number) =>
    Number.isFinite(n) ? Math.min(hi, Math.max(0, Math.trunc(n))) : 0;
  return { hour: clamp(h, 23), minute: clamp(m, 59) };
}

/** Subtract `min` minutes from "HH:mm", wrapping within 24h. */
export function subtractMinutesHm(hm: string, min: number): string {
  const { hour, minute } = parseHm(hm);
  let total = hour * 60 + minute - min;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
