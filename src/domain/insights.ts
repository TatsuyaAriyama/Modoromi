import type { SleepSession } from './types';
import { minuteOfDay } from './consistency';
import { isQualityConfirmed } from './score';

/**
 * Quiet, honest observations mined from accumulated history. Unlike the weekly
 * review (a fixed time window), insights look for cross-cutting patterns and
 * only speak when there is enough data to be trustworthy. Each is a 気づき, an
 * observation — never a directive.
 */
export interface Insight {
  id: string;
  text: string;
}

/** No pattern is trustworthy below this many sessions. */
export const MIN_SESSIONS_FOR_INSIGHT = 5;
/** Each side of a comparison needs at least this many sessions. */
const MIN_GROUP = 2;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Minutes into the evening, measured from 18:00, so bedtimes that straddle
 * midnight (23:40 vs 00:20) stay close together on a single linear axis.
 */
function eveningMinute(iso: string): number {
  return (minuteOfDay(iso) - 18 * 60 + 1440) % 1440;
}

export function deriveInsights(
  sessions: SleepSession[],
  targetMin: number,
): Insight[] {
  if (sessions.length < MIN_SESSIONS_FOR_INSIGHT) return [];
  const out: Insight[] = [];

  const dq = durationQualityInsight(sessions, targetMin);
  if (dq) out.push(dq);

  const wd = weekendDriftInsight(sessions);
  if (wd) out.push(wd);

  return out;
}

/** Do nights that hit the target tend to score better? */
function durationQualityInsight(
  sessions: SleepSession[],
  targetMin: number,
): Insight | null {
  const scored = sessions.filter(isQualityConfirmed);
  const met = scored
    .filter((s) => s.durationMin >= targetMin)
    .map((s) => s.qualityScore as number);
  const short = scored
    .filter((s) => s.durationMin < targetMin)
    .map((s) => s.qualityScore as number);
  if (met.length < MIN_GROUP || short.length < MIN_GROUP) return null;

  const diff = Math.round(mean(met) - mean(short));
  if (diff >= 8) {
    return {
      id: 'duration-quality',
      text: `目標どおり眠れた日は、質スコアが高めです（平均 +${diff}）`,
    };
  }
  return null;
}

/** Does bedtime drift later on weekend nights (Fri/Sat)? */
function weekendDriftInsight(sessions: SleepSession[]): Insight | null {
  const weekend: number[] = [];
  const weekday: number[] = [];
  for (const s of sessions) {
    const em = eveningMinute(s.startedAt);
    if (em > 600) continue; // outside the ~18:00–04:00 bedtime band
    const day = new Date(s.startedAt).getDay(); // weekday the user went to bed
    (day === 5 || day === 6 ? weekend : weekday).push(em);
  }
  if (weekend.length < MIN_GROUP || weekday.length < MIN_GROUP) return null;

  const diff = Math.round(mean(weekend) - mean(weekday));
  if (diff >= 45) {
    return {
      id: 'weekend-drift',
      text: `週末は就寝が ${diff}分ほど遅くなりがちです`,
    };
  }
  return null;
}
