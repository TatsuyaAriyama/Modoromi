import { describe, expect, it } from 'vitest';
import {
  circularStdMinutes,
  consistencyScore,
  minuteOfDay,
  regularityLevel,
} from './consistency';
import type { SleepSession } from './types';

describe('minuteOfDay', () => {
  it('returns local minutes since midnight', () => {
    expect(minuteOfDay(new Date(2026, 5, 20, 7, 30).toISOString())).toBe(450);
    expect(minuteOfDay(new Date(2026, 5, 20, 0, 0).toISOString())).toBe(0);
  });
});

describe('circularStdMinutes', () => {
  it('is zero for identical times', () => {
    expect(circularStdMinutes([420, 420, 420])).toBe(0);
  });
  it('is small across the midnight wrap (23:50 vs 00:10)', () => {
    // 20 minutes apart on the dial — must not be treated as ~23h apart.
    const std = circularStdMinutes([1430, 10]);
    expect(std).toBeLessThan(20);
  });
  it('grows with spread', () => {
    const tight = circularStdMinutes([420, 430, 425]);
    const loose = circularStdMinutes([300, 540, 420]);
    expect(loose).toBeGreaterThan(tight);
  });
  it('returns 0 for a single sample', () => {
    expect(circularStdMinutes([420])).toBe(0);
  });
});

describe('consistencyScore', () => {
  const NOW = new Date(2026, 5, 20, 12, 0);

  function session(bed: Date, wake: Date): SleepSession {
    return {
      id: `${bed.getTime()}`,
      startedAt: bed.toISOString(),
      endedAt: wake.toISOString(),
      durationMin: Math.round((wake.getTime() - bed.getTime()) / 60000),
    };
  }

  it('is null with fewer than two recent sessions', () => {
    expect(consistencyScore([], 7, NOW)).toBeNull();
    expect(
      consistencyScore(
        [session(new Date(2026, 5, 19, 23, 0), new Date(2026, 5, 20, 7, 0))],
        7,
        NOW,
      ),
    ).toBeNull();
  });

  it('is ~1 for a perfectly regular schedule', () => {
    const sessions = [
      session(new Date(2026, 5, 17, 23, 0), new Date(2026, 5, 18, 7, 0)),
      session(new Date(2026, 5, 18, 23, 0), new Date(2026, 5, 19, 7, 0)),
      session(new Date(2026, 5, 19, 23, 0), new Date(2026, 5, 20, 7, 0)),
    ];
    expect(consistencyScore(sessions, 7, NOW)).toBeCloseTo(1, 5);
  });

  it('drops for an erratic schedule', () => {
    const regular = [
      session(new Date(2026, 5, 18, 23, 0), new Date(2026, 5, 19, 7, 0)),
      session(new Date(2026, 5, 19, 23, 0), new Date(2026, 5, 20, 7, 0)),
    ];
    const erratic = [
      session(new Date(2026, 5, 18, 21, 0), new Date(2026, 5, 19, 5, 0)),
      session(new Date(2026, 5, 20, 1, 0), new Date(2026, 5, 20, 9, 0)),
    ];
    const r = consistencyScore(regular, 7, NOW)!;
    const e = consistencyScore(erratic, 7, NOW)!;
    expect(e).toBeLessThan(r);
  });

  it('ignores sessions outside the window', () => {
    const sessions = [
      session(new Date(2026, 5, 1, 23, 0), new Date(2026, 5, 2, 7, 0)), // old
      session(new Date(2026, 5, 19, 23, 0), new Date(2026, 5, 20, 7, 0)),
    ];
    // Only one in-window session -> null.
    expect(consistencyScore(sessions, 7, NOW)).toBeNull();
  });
});

describe('regularityLevel', () => {
  it('buckets the score', () => {
    expect(regularityLevel(0.9)).toBe('high');
    expect(regularityLevel(0.5)).toBe('medium');
    expect(regularityLevel(0.2)).toBe('low');
  });
});
