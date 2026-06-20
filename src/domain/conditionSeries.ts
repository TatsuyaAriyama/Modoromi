import type { Lang, SleepSession } from './types';
import { dayKey, sleepDebtMin } from './debt';
import { consistencyScore } from './consistency';
import { thinkingCondition } from './condition';
import { weekdayName } from './format';

export interface ConditionPoint {
  key: string;
  label: string;
  /** 0–100 thinking-condition index, or null on days with no confirmed score. */
  index: number | null;
}

/** End-of-day timestamp, so a day's own sleep is inside its trailing window. */
function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

/**
 * Per-day thinking-condition index across the trailing `days` window, oldest →
 * newest. Each day is evaluated *as of* that day: sleep debt and regularity use
 * only sessions up to that day's end, mirroring how Home derives today's
 * condition. A day contributes a point only when a quality score was confirmed
 * for the night ending that day; other days are null (a gap), matching how the
 * quality trend treats un-logged days. Still a 目安, never a verdict.
 */
export function buildConditionSeries(
  sessions: SleepSession[],
  targetMin: number,
  days: number,
  now: Date = new Date(),
  lang: Lang = 'en',
): ConditionPoint[] {
  // Average of confirmed quality scores per wake day.
  const qAgg = new Map<string, { sum: number; n: number }>();
  for (const s of sessions) {
    if (s.qualityScore == null) continue;
    const k = dayKey(new Date(s.endedAt));
    const cur = qAgg.get(k) ?? { sum: 0, n: 0 };
    cur.sum += s.qualityScore;
    cur.n += 1;
    qAgg.set(k, cur);
  }

  const out: ConditionPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const label =
      days <= 7 ? weekdayName(d.getDay(), lang) : String(d.getDate());
    const q = qAgg.get(key);
    if (!q) {
      out.push({ key, label, index: null });
      continue;
    }
    const asOf = endOfDay(d);
    const { index } = thinkingCondition({
      lastQuality: Math.round(q.sum / q.n),
      debtMin: sleepDebtMin(sessions, targetMin, 7, asOf),
      consistency: consistencyScore(sessions, 7, asOf),
    });
    out.push({ key, label, index });
  }
  return out;
}
