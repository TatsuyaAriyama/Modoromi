import { describe, expect, it } from 'vitest';
import { themeLog } from './themeLog';
import type { Mood, SleepSession } from './types';

function mk(
  wake: Date,
  opts: { theme?: string; quality?: number; mood?: Mood } = {},
): SleepSession {
  return {
    id: `${wake.getTime()}`,
    startedAt: new Date(wake.getTime() - 8 * 3600000).toISOString(),
    endedAt: wake.toISOString(),
    durationMin: 480,
    ...(opts.theme !== undefined ? { theme: opts.theme } : {}),
    ...(opts.mood ? { mood: opts.mood } : {}),
    ...(opts.quality != null ? { qualityScore: opts.quality } : {}),
  };
}

describe('themeLog', () => {
  it('returns nothing without themes', () => {
    expect(themeLog([mk(new Date(2026, 5, 20, 7, 0))])).toEqual([]);
  });

  it('skips blank themes', () => {
    expect(themeLog([mk(new Date(2026, 5, 20, 7, 0), { theme: '   ' })])).toEqual(
      [],
    );
  });

  it('orders newest wake first and trims the theme', () => {
    const log = themeLog([
      mk(new Date(2026, 5, 18, 7, 0), { theme: '古い' }),
      mk(new Date(2026, 5, 20, 7, 0), { theme: '  新しい  ' }),
      mk(new Date(2026, 5, 19, 7, 0), { theme: '中間' }),
    ]);
    expect(log.map((e) => e.theme)).toEqual(['新しい', '中間', '古い']);
  });

  it('surfaces quality only once confirmed', () => {
    const log = themeLog([
      mk(new Date(2026, 5, 20, 7, 0), {
        theme: '確定',
        quality: 82,
        mood: 'fresh',
      }),
      mk(new Date(2026, 5, 19, 7, 0), { theme: '未確定', quality: 70 }),
    ]);
    expect(log[0].qualityScore).toBe(82);
    expect(log[1].qualityScore).toBeNull();
  });

  it('caps at the requested limit', () => {
    const sessions = Array.from({ length: 15 }, (_, i) =>
      mk(new Date(2026, 5, i + 1, 7, 0), { theme: `t${i}` }),
    );
    expect(themeLog(sessions, 10)).toHaveLength(10);
  });
});
