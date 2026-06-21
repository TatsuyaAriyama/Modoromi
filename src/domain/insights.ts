import type { SleepSession } from './types';
import { minuteOfDay } from './consistency';
import { isQualityConfirmed } from './score';
import { movementsPerHour, RESTLESS_LEVELS } from './motion';

/**
 * Quiet, honest observations mined from accumulated history. Unlike the weekly
 * review (a fixed time window), insights look for cross-cutting patterns and
 * only speak when there is enough data to be trustworthy. Each is a 気づき, an
 * observation — never a directive.
 */
export interface Insight {
  /** Catalog token id (translated in the UI via `insight.<id>`). */
  id: string;
  /** Interpolation values for the translated template. */
  params?: Record<string, number>;
}

/** No pattern is trustworthy below this many sessions. */
export const MIN_SESSIONS_FOR_INSIGHT = 5;
/** Each side of a comparison needs at least this many sessions. */
const MIN_GROUP = 2;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Robust centre — unlike the mean it isn't dragged into a bimodal gap. */
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
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

  const st = stillnessQualityInsight(sessions);
  if (st) out.push(st);

  const rh = rhythmQualityInsight(sessions);
  if (rh) out.push(rh);

  const th = themeQualityInsight(sessions);
  if (th) out.push(th);

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
    return { id: 'duration-quality', params: { diff } };
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
    return { id: 'weekend-drift', params: { diff } };
  }
  return null;
}

/** Do calmer (less restless) nights tend to score better? */
function stillnessQualityInsight(sessions: SleepSession[]): Insight | null {
  // Only nights where motion was actually tracked carry a movement signal.
  const tracked = sessions.filter(
    (s) => isQualityConfirmed(s) && s.movements != null,
  );
  const calm: number[] = [];
  const restless: number[] = [];
  for (const s of tracked) {
    const perHour = movementsPerHour(
      (s.movements as { t: number }[]).length,
      s.durationMin,
    );
    const q = s.qualityScore as number;
    (perHour <= RESTLESS_LEVELS.calm ? calm : restless).push(q);
  }
  if (calm.length < MIN_GROUP || restless.length < MIN_GROUP) return null;

  const diff = Math.round(mean(calm) - mean(restless));
  if (diff >= 8) {
    return { id: 'stillness-quality', params: { diff } };
  }
  return null;
}

/**
 * Do mornings where you set a thinking theme tend to score better? A quiet,
 * honest observation — sleep in service of thinking, reflected back. No claim
 * of cause; just that themed days and rested days have tended to coincide.
 */
function themeQualityInsight(sessions: SleepSession[]): Insight | null {
  const scored = sessions.filter(isQualityConfirmed);
  const hasTheme = (s: SleepSession) =>
    s.theme != null && s.theme.trim() !== '';
  const themed = scored
    .filter(hasTheme)
    .map((s) => s.qualityScore as number);
  const plain = scored
    .filter((s) => !hasTheme(s))
    .map((s) => s.qualityScore as number);
  if (themed.length < MIN_GROUP || plain.length < MIN_GROUP) return null;

  const diff = Math.round(mean(themed) - mean(plain));
  if (diff >= 8) {
    return { id: 'theme-quality', params: { diff } };
  }
  return null;
}

/** Do nights close to your usual bedtime score better than off-rhythm ones? */
function rhythmQualityInsight(sessions: SleepSession[]): Insight | null {
  const scored = sessions
    .filter(isQualityConfirmed)
    .map((s) => ({ em: eveningMinute(s.startedAt), q: s.qualityScore as number }))
    .filter((x) => x.em <= 600); // within the ~18:00–04:00 bedtime band
  if (scored.length < MIN_GROUP * 2) return null;

  const typical = median(scored.map((x) => x.em));
  const near: number[] = [];
  const off: number[] = [];
  for (const x of scored) {
    (Math.abs(x.em - typical) <= 45 ? near : off).push(x.q);
  }
  if (near.length < MIN_GROUP || off.length < MIN_GROUP) return null;

  const diff = Math.round(mean(near) - mean(off));
  if (diff >= 8) {
    return { id: 'rhythm-quality', params: { diff } };
  }
  return null;
}
