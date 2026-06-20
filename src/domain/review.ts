import type { SleepSession } from './types';
import { averageDuration, averageQuality, buildDaySeries } from './history';
import { consistencyScore } from './consistency';

export interface WeeklyReview {
  /** Nights with a recorded session in the trailing 7 days. */
  loggedNights: number;
  /** Average sleep duration this week (minutes); 0 if none. */
  avgDurationMin: number;
  /** Average duration minus target (negative = short of target). */
  durationVsTargetMin: number;
  /** Average quality this week, or null when nothing is confirmed. */
  avgQuality: number | null;
  /** This week's avg quality minus last week's, or null if not comparable. */
  qualityDeltaVsPrev: number | null;
  /** Sleep regularity 0–1, or null. */
  consistency: number | null;
  /**
   * Catalog token ids for a quiet one-line summary (a 目安, not advice). The UI
   * translates each via `review.<token>` and joins them. Empty = no records.
   */
  headlineParts: ReviewHeadlineToken[];
}

export type ReviewHeadlineToken =
  | 'none'
  | 'onTarget'
  | 'slightlyShort'
  | 'wellShort'
  | 'qualityUp'
  | 'qualityFlat'
  | 'qualityDown';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Summarise the trailing 7 days and compare with the 7 days before that.
 * Pure and deterministic given `now`; reuses the day-series helpers so the
 * weekly numbers always agree with the charts.
 */
export function weeklyReview(
  sessions: SleepSession[],
  targetMin: number,
  now: Date = new Date(),
): WeeklyReview {
  const thisWeek = buildDaySeries(sessions, 7, now);
  const prevNow = new Date(now.getTime() - 7 * DAY_MS);
  const prevWeek = buildDaySeries(sessions, 7, prevNow);

  const loggedNights = thisWeek.filter((d) => d.durationMin > 0).length;
  const avgDurationMin = averageDuration(thisWeek);
  const avgQuality = averageQuality(thisWeek);
  const prevQuality = averageQuality(prevWeek);
  const qualityDeltaVsPrev =
    avgQuality != null && prevQuality != null
      ? avgQuality - prevQuality
      : null;
  const consistency = consistencyScore(sessions, 7, now);
  const durationVsTargetMin = avgDurationMin > 0 ? avgDurationMin - targetMin : 0;

  return {
    loggedNights,
    avgDurationMin,
    durationVsTargetMin,
    avgQuality,
    qualityDeltaVsPrev,
    consistency,
    headlineParts: buildHeadlineParts({
      loggedNights,
      durationVsTargetMin,
      qualityDeltaVsPrev,
    }),
  };
}

function buildHeadlineParts(o: {
  loggedNights: number;
  durationVsTargetMin: number;
  qualityDeltaVsPrev: number | null;
}): ReviewHeadlineToken[] {
  if (o.loggedNights === 0) return ['none'];

  const parts: ReviewHeadlineToken[] = [];

  // Duration vs target (within 20 min counts as on-target).
  if (o.durationVsTargetMin >= -20) parts.push('onTarget');
  else if (o.durationVsTargetMin >= -60) parts.push('slightlyShort');
  else parts.push('wellShort');

  // Quality trend vs last week.
  if (o.qualityDeltaVsPrev != null) {
    if (o.qualityDeltaVsPrev >= 5) parts.push('qualityUp');
    else if (o.qualityDeltaVsPrev <= -5) parts.push('qualityDown');
    else parts.push('qualityFlat');
  }

  return parts;
}
