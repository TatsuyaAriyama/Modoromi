import { describe, expect, it } from 'vitest';
import { buildScheduleSeries, eveningMinute } from './schedule';
import type { SleepSession } from './types';

const NOW = new Date(2026, 5, 20, 12, 0);

function session(start: Date, durationMin: number): SleepSession {
  const end = new Date(start.getTime() + durationMin * 60000);
  return {
    id: `${start.getTime()}-${durationMin}`,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMin,
  };
}

describe('eveningMinute', () => {
  it('maps clock times onto the 18:00-anchored axis', () => {
    expect(eveningMinute(new Date(2026, 5, 19, 23, 0).toISOString())).toBe(300);
    expect(eveningMinute(new Date(2026, 5, 20, 7, 0).toISOString())).toBe(780);
    expect(eveningMinute(new Date(2026, 5, 20, 18, 0).toISOString())).toBe(0);
  });
});

describe('buildScheduleSeries', () => {
  it('yields nulls for unlogged days', () => {
    const series = buildScheduleSeries([], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series.every((d) => d.bedEm === null && d.wakeEm === null)).toBe(true);
  });

  it('places a midnight-straddling night on its wake day', () => {
    // Bed 23:00 Jun 19 → wake 07:00 Jun 20.
    const series = buildScheduleSeries(
      [session(new Date(2026, 5, 19, 23, 0), 480)],
      7,
      NOW,
    );
    const today = series[series.length - 1];
    expect(today.bedEm).toBe(300);
    expect(today.wakeEm).toBe(780);
  });

  it('picks the longest session as the main sleep of the day', () => {
    const nap = session(new Date(2026, 5, 20, 1, 0), 60);
    const night = session(new Date(2026, 5, 19, 23, 0), 450);
    const series = buildScheduleSeries([nap, night], 7, NOW);
    expect(series[series.length - 1].bedEm).toBe(300);
  });
});
