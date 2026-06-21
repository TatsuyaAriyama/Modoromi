import type { SleepSession } from './types';
import { isQualityConfirmed } from './score';

/**
 * A past "thing to think about today" paired with how that day's sleep scored.
 * Turning the otherwise-ephemeral morning theme into a quiet journal — a way to
 * look back at what you set out to think about, and how rested you were for it.
 */
export interface ThemeEntry {
  id: string;
  /** ISO wake time of the session the theme was set on. */
  endedAt: string;
  theme: string;
  /** Confirmed quality score for that night, or null if not yet confirmed. */
  qualityScore: number | null;
}

/**
 * Themed sessions, newest wake first, capped at `limit`. Blank themes are
 * skipped. Quality is surfaced only once the morning check has confirmed it.
 */
export function themeLog(
  sessions: SleepSession[],
  limit = 10,
): ThemeEntry[] {
  return sessions
    .filter((s) => s.theme != null && s.theme.trim() !== '')
    .sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    )
    .slice(0, limit)
    .map((s) => ({
      id: s.id,
      endedAt: s.endedAt,
      theme: (s.theme as string).trim(),
      qualityScore: isQualityConfirmed(s) ? (s.qualityScore as number) : null,
    }));
}
