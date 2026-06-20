import { describe, expect, it } from 'vitest';
import { weeklyReview } from './review';
import type { SleepSession } from './types';

const NOW = new Date(2026, 5, 20, 12, 0); // Saturday
const TARGET = 450;

function session(
  wake: Date,
  durationMin: number,
  qualityScore?: number,
): SleepSession {
  return {
    id: `${wake.getTime()}-${durationMin}`,
    startedAt: new Date(wake.getTime() - durationMin * 60000).toISOString(),
    endedAt: wake.toISOString(),
    durationMin,
    ...(qualityScore != null ? { qualityScore } : {}),
  };
}

describe('weeklyReview', () => {
  it('reports an empty week cleanly', () => {
    const r = weeklyReview([], TARGET, NOW);
    expect(r.loggedNights).toBe(0);
    expect(r.avgDurationMin).toBe(0);
    expect(r.durationVsTargetMin).toBe(0);
    expect(r.avgQuality).toBeNull();
    expect(r.qualityDeltaVsPrev).toBeNull();
    expect(r.headline).toBe('今週の記録はまだありません');
  });

  it('counts logged nights and averages duration in the trailing week', () => {
    const sessions = [
      session(new Date(2026, 5, 20, 7, 0), 450, 80),
      session(new Date(2026, 5, 19, 7, 0), 420, 70),
      session(new Date(2026, 5, 18, 7, 0), 480, 90),
    ];
    const r = weeklyReview(sessions, TARGET, NOW);
    expect(r.loggedNights).toBe(3);
    expect(r.avgDurationMin).toBe(450);
    expect(r.durationVsTargetMin).toBe(0);
    expect(r.avgQuality).toBe(80);
  });

  it('compares quality against the previous week', () => {
    const sessions = [
      // this week (avg 80)
      session(new Date(2026, 5, 20, 7, 0), 450, 80),
      session(new Date(2026, 5, 19, 7, 0), 450, 80),
      // last week (avg 60)
      session(new Date(2026, 5, 13, 7, 0), 450, 60),
      session(new Date(2026, 5, 12, 7, 0), 450, 60),
    ];
    const r = weeklyReview(sessions, TARGET, NOW);
    expect(r.qualityDeltaVsPrev).toBe(20);
    expect(r.headline).toContain('上向き');
  });

  it('flags a week well below target', () => {
    const sessions = [
      session(new Date(2026, 5, 20, 6, 0), 300),
      session(new Date(2026, 5, 19, 6, 0), 320),
    ];
    const r = weeklyReview(sessions, TARGET, NOW);
    expect(r.durationVsTargetMin).toBeLessThan(-60);
    expect(r.headline).toContain('大きく下回');
  });

  it('treats near-target as on-target in the headline', () => {
    const sessions = [
      session(new Date(2026, 5, 20, 7, 0), 445),
      session(new Date(2026, 5, 19, 7, 0), 450),
    ];
    const r = weeklyReview(sessions, TARGET, NOW);
    expect(r.headline).toContain('目標どおり');
  });
});
