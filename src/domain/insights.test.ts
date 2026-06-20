import { describe, expect, it } from 'vitest';
import { deriveInsights } from './insights';
import type { Mood, SleepSession } from './types';

const TARGET = 450;

function mk(
  start: Date,
  durationMin: number,
  opts: { quality?: number; mood?: Mood } = {},
): SleepSession {
  const end = new Date(start.getTime() + durationMin * 60000);
  return {
    id: `${start.getTime()}-${durationMin}`,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMin,
    ...(opts.mood ? { mood: opts.mood } : {}),
    ...(opts.quality != null ? { qualityScore: opts.quality } : {}),
  };
}

describe('deriveInsights', () => {
  it('stays silent until there is enough data', () => {
    const few = [
      mk(new Date(2026, 5, 1, 23, 0), 450, { quality: 80, mood: 'fresh' }),
      mk(new Date(2026, 5, 2, 23, 0), 300, { quality: 60, mood: 'groggy' }),
    ];
    expect(deriveInsights(few, TARGET)).toEqual([]);
  });

  it('notices that on-target nights score better', () => {
    const sessions = [
      // met target → high quality
      mk(new Date(2026, 5, 1, 23, 0), 460, { quality: 85, mood: 'fresh' }),
      mk(new Date(2026, 5, 2, 23, 0), 470, { quality: 88, mood: 'fresh' }),
      mk(new Date(2026, 5, 3, 23, 0), 455, { quality: 84, mood: 'fresh' }),
      // short of target → lower quality
      mk(new Date(2026, 5, 4, 23, 0), 360, { quality: 64, mood: 'groggy' }),
      mk(new Date(2026, 5, 5, 23, 0), 340, { quality: 60, mood: 'groggy' }),
    ];
    const ins = deriveInsights(sessions, TARGET);
    const dq = ins.find((i) => i.id === 'duration-quality');
    expect(dq).toBeTruthy();
    expect(dq?.text).toContain('質スコアが高め');
  });

  it('does not flag a duration link when scores are similar', () => {
    const sessions = [
      mk(new Date(2026, 5, 1, 23, 0), 460, { quality: 75, mood: 'normal' }),
      mk(new Date(2026, 5, 2, 23, 0), 470, { quality: 76, mood: 'normal' }),
      mk(new Date(2026, 5, 3, 23, 0), 360, { quality: 74, mood: 'normal' }),
      mk(new Date(2026, 5, 4, 23, 0), 340, { quality: 73, mood: 'normal' }),
      mk(new Date(2026, 5, 5, 23, 0), 350, { quality: 75, mood: 'normal' }),
    ];
    const ins = deriveInsights(sessions, TARGET);
    expect(ins.find((i) => i.id === 'duration-quality')).toBeUndefined();
  });

  it('notices weekend bedtime drift', () => {
    const sessions = [
      // weekday bedtimes ~22:00 (Mon–Wed)
      mk(new Date(2026, 5, 15, 22, 0), 450),
      mk(new Date(2026, 5, 16, 22, 0), 450),
      mk(new Date(2026, 5, 17, 22, 0), 450),
      // weekend bedtimes ~23:45 (Fri 19th, Sat 20th)
      mk(new Date(2026, 5, 19, 23, 45), 420),
      mk(new Date(2026, 5, 20, 23, 45), 420),
    ];
    const ins = deriveInsights(sessions, TARGET);
    const wd = ins.find((i) => i.id === 'weekend-drift');
    expect(wd).toBeTruthy();
    expect(wd?.text).toContain('週末');
  });
});
