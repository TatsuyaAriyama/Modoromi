import { describe, expect, it } from 'vitest';
import { buildConditionSeries } from './conditionSeries';
import { thinkingCondition } from './condition';
import type { SleepSession } from './types';

const TARGET = 450;

function session(
  partial: Partial<SleepSession> & { id: string; endedAt: string },
): SleepSession {
  return {
    startedAt: partial.startedAt ?? '2026-06-20T23:00:00',
    durationMin: partial.durationMin ?? TARGET,
    ...partial,
  } as SleepSession;
}

describe('buildConditionSeries', () => {
  const now = new Date('2026-06-21T12:00:00'); // Sunday

  it('returns one point per day in the window', () => {
    expect(buildConditionSeries([], TARGET, 7, now)).toHaveLength(7);
    expect(buildConditionSeries([], TARGET, 30, now)).toHaveLength(30);
  });

  it('leaves days without a confirmed score as null', () => {
    const series = buildConditionSeries([], TARGET, 7, now);
    expect(series.every((p) => p.index === null)).toBe(true);
  });

  it('scores a day from its confirmed quality, debt, and regularity', () => {
    // One night ending today, slept exactly the target, quality 80. Only one
    // session → regularity unknown, debt zero → index mirrors quality.
    const s = session({
      id: 'a',
      startedAt: '2026-06-20T23:00:00',
      endedAt: '2026-06-21T06:30:00',
      durationMin: TARGET,
      qualityScore: 80,
    });
    const series = buildConditionSeries([s], TARGET, 7, now);
    const today = series[series.length - 1];
    const expected = thinkingCondition({
      lastQuality: 80,
      debtMin: 0,
      consistency: null,
    });
    expect(today.index).toBe(expected.index);
    expect(today.index).toBe(80);
    // Earlier days stay null.
    expect(series.slice(0, -1).every((p) => p.index === null)).toBe(true);
  });

  it('ignores sessions with no confirmed quality score', () => {
    const s = session({
      id: 'b',
      endedAt: '2026-06-21T06:30:00',
      // no qualityScore
    });
    const series = buildConditionSeries([s], TARGET, 7, now);
    expect(series[series.length - 1].index).toBeNull();
  });

  it('labels weekly views by weekday and monthly views by date', () => {
    const week = buildConditionSeries([], TARGET, 7, now, 'en');
    expect(week[week.length - 1].label).toBe('Sun');
    const month = buildConditionSeries([], TARGET, 30, now, 'en');
    expect(month[month.length - 1].label).toBe('21');
  });
});
