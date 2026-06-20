import { describe, expect, it } from 'vitest';
import {
  averageDuration,
  averageQuality,
  buildDaySeries,
} from './history';
import type { SleepSession } from './types';

// Fixed "now": Saturday 2026-06-20.
const NOW = new Date(2026, 5, 20, 12, 0);

function session(
  endLocal: Date,
  durationMin: number,
  qualityScore?: number,
): SleepSession {
  return {
    id: `${endLocal.getTime()}-${durationMin}`,
    startedAt: new Date(endLocal.getTime() - durationMin * 60000).toISOString(),
    endedAt: endLocal.toISOString(),
    durationMin,
    ...(qualityScore != null ? { qualityScore } : {}),
  };
}

describe('buildDaySeries', () => {
  it('returns one oldest→newest entry per day in the window', () => {
    const series = buildDaySeries([], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series[6].key).toBe('2026-06-20'); // newest is today
    expect(series[0].key).toBe('2026-06-14'); // oldest is 6 days back
    expect(series[6].durationMin).toBe(0);
    expect(series[6].qualityScore).toBeNull();
  });

  it('sums durations and averages quality within a wake day', () => {
    const sessions = [
      session(new Date(2026, 5, 20, 7, 0), 450, 80),
      session(new Date(2026, 5, 20, 3, 0), 30, 40), // same wake day
      session(new Date(2026, 5, 19, 7, 0), 400, 60),
    ];
    const series = buildDaySeries(sessions, 7, NOW);
    const today = series[6];
    expect(today.durationMin).toBe(480); // 450 + 30
    expect(today.qualityScore).toBe(60); // (80 + 40) / 2
    const yesterday = series[5];
    expect(yesterday.durationMin).toBe(400);
    expect(yesterday.qualityScore).toBe(60);
  });

  it('labels short windows by weekday and long windows by date', () => {
    expect(buildDaySeries([], 7, NOW)[6].label).toBe('Sat'); // 06-20 = Saturday
    expect(buildDaySeries([], 7, NOW, 'ja')[6].label).toBe('土');
    expect(buildDaySeries([], 30, NOW)[29].label).toBe('20');
  });

  it('ignores sessions without a confirmed quality score', () => {
    const series = buildDaySeries(
      [session(new Date(2026, 5, 20, 7, 0), 450)],
      7,
      NOW,
    );
    expect(series[6].durationMin).toBe(450);
    expect(series[6].qualityScore).toBeNull();
  });
});

describe('averageDuration', () => {
  it('averages only days that have sleep', () => {
    const series = buildDaySeries(
      [
        session(new Date(2026, 5, 20, 7, 0), 480),
        session(new Date(2026, 5, 19, 7, 0), 400),
      ],
      7,
      NOW,
    );
    expect(averageDuration(series)).toBe(440);
  });

  it('is zero with no data', () => {
    expect(averageDuration(buildDaySeries([], 7, NOW))).toBe(0);
  });
});

describe('averageQuality', () => {
  it('averages confirmed scores only', () => {
    const series = buildDaySeries(
      [
        session(new Date(2026, 5, 20, 7, 0), 480, 80),
        session(new Date(2026, 5, 19, 7, 0), 400, 60),
      ],
      7,
      NOW,
    );
    expect(averageQuality(series)).toBe(70);
  });

  it('is null when nothing is confirmed', () => {
    expect(averageQuality(buildDaySeries([], 7, NOW))).toBeNull();
  });
});
