import { minuteOfDay } from './consistency';
import type { SleepSession } from './types';

/**
 * The model behind a shareable card. Pure: a session plus already-localized
 * labels in, a flat description out. Nothing here touches a canvas, so it is
 * fully testable under jsdom (which has no canvas at all).
 *
 * REDACTION IS STRUCTURAL. When the user has not opted into showing times,
 * the model carries no bed/wake keys whatsoever — not empty strings, not
 * nulls. A painter bug therefore cannot leak a time, and the test asserts the
 * absence of a property rather than the absence of some pixels. `note` has no
 * flag at all and never enters the model.
 */

export interface ShareOptions {
  showTimes: boolean;
  showTheme: boolean;
}

/** Pre-formatted and pre-localized by the caller — this module has no i18n. */
export interface ShareLabels {
  date: string;
  duration: string;
  bedHm: string;
  wakeHm: string;
}

export interface ShareCardModel {
  dateLabel: string;
  durationLabel: string;
  durationMin: number;
  /** Minute-of-day the night began; the orbit's angular start. */
  bedMin: number;
  /** Minutes the night ran; the orbit's sweep. */
  sweepMin: number;
  /** Absent unless showTimes. */
  timesLabel?: string;
  /** Absent unless showTheme AND the theme is non-empty. */
  theme?: string;
}

export function buildShareCard(
  session: SleepSession,
  labels: ShareLabels,
  opts: ShareOptions,
): ShareCardModel {
  const bedMin = minuteOfDay(session.startedAt);
  const wakeMin = minuteOfDay(session.endedAt);
  const theme = session.theme?.trim();
  return {
    dateLabel: labels.date,
    durationLabel: labels.duration,
    durationMin: session.durationMin,
    bedMin,
    // A night that starts and ends at the same clock minute is either a
    // 24-hour session or a rounding artefact; fall back to the real duration
    // rather than drawing a zero-length arc.
    sweepMin: ((wakeMin - bedMin + 1440) % 1440) || session.durationMin,
    ...(opts.showTimes
      ? { timesLabel: `${labels.bedHm} → ${labels.wakeHm}` }
      : {}),
    ...(opts.showTheme && theme ? { theme } : {}),
  };
}
