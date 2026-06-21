import type { SleepSession } from './types';
import { isoToHm } from './format';

/**
 * Spreadsheet-friendly CSV export of sleep history. Pure — no I/O. Unlike the
 * JSON backup (a faithful, restorable snapshot), this is a flat, human-readable
 * view for opening in Numbers/Excel: one row per night, oldest → newest, with
 * the fields a person actually reads. It is intentionally lossy (no movement
 * samples), so it is an *export*, never an import format.
 */

/** Column order. Kept stable so downstream sheets/scripts don't break. */
export const CSV_COLUMNS = [
  'date',
  'bedtime',
  'wake',
  'durationMin',
  'mood',
  'quality',
  'subjective',
  'movements',
  'note',
  'theme',
] as const;

/** Quote a field per RFC 4180 when it contains a comma, quote, or newline. */
function csvField(value: string | number | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Local calendar date (YYYY-MM-DD) of the wake time, for the `date` column. */
function wakeDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build the CSV text (header + rows) for the given sessions. */
export function sessionsToCsv(sessions: SleepSession[]): string {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime(),
  );
  const rows = sorted.map((s) =>
    [
      wakeDate(s.endedAt),
      isoToHm(s.startedAt),
      isoToHm(s.endedAt),
      s.durationMin,
      s.mood,
      s.qualityScore,
      s.subjective,
      s.movements ? s.movements.length : undefined,
      s.note,
      s.theme,
    ]
      .map(csvField)
      .join(','),
  );
  // CRLF line endings — the RFC 4180 default, and what Excel expects.
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n');
}
