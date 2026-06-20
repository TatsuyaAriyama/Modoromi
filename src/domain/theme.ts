import type { SleepSession } from './types';
import { dayKey } from './debt';

/**
 * The thinking theme set at this morning's check, if any. Returns the theme of
 * the most recent session that woke today and carries a non-empty theme, so it
 * naturally clears overnight and reappears after the next morning check.
 */
export function todaysTheme(
  sessions: SleepSession[],
  now: Date = new Date(),
): string | null {
  const today = dayKey(now);
  const todays = sessions
    .filter(
      (s) =>
        s.theme != null &&
        s.theme.trim() !== '' &&
        dayKey(new Date(s.endedAt)) === today,
    )
    .sort(
      (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    );
  return todays.length > 0 ? (todays[0].theme as string).trim() : null;
}
