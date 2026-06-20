import { describe, expect, it } from 'vitest';
import {
  clamp,
  computeQualityScore,
  durationScore,
  isQualityConfirmed,
  moodScore,
} from './score';
import type { SleepSession } from './types';

describe('clamp', () => {
  it('bounds within range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('durationScore', () => {
  it('is 1 when exactly on target', () => {
    expect(durationScore(450, 450)).toBe(1);
  });
  it('falls off as you diverge from target', () => {
    expect(durationScore(225, 450)).toBeCloseTo(0.5, 5);
    expect(durationScore(675, 450)).toBeCloseTo(0.5, 5);
  });
  it('clamps to 0 for extreme divergence', () => {
    expect(durationScore(0, 450)).toBe(0);
    expect(durationScore(1200, 450)).toBe(0);
  });
  it('guards zero target', () => {
    expect(durationScore(450, 0)).toBe(0);
  });
});

describe('moodScore', () => {
  it('maps moods', () => {
    expect(moodScore('fresh')).toBe(1.0);
    expect(moodScore('normal')).toBe(0.6);
    expect(moodScore('groggy')).toBe(0.3);
  });
  it('defaults to normal when undefined', () => {
    expect(moodScore(undefined)).toBe(0.6);
  });
});

describe('computeQualityScore', () => {
  it('on-target + fresh = 100', () => {
    expect(computeQualityScore(450, 'fresh', 450)).toBe(100);
  });
  it('on-target + groggy = 0.6 + 0.3*0.4 -> 72', () => {
    // ds=1 -> 0.6 ; ms=0.3 -> 0.12 ; *100 = 72
    expect(computeQualityScore(450, 'groggy', 450)).toBe(72);
  });
  it('half-duration + normal', () => {
    // ds=0.5 -> 0.3 ; ms=0.6 -> 0.24 ; *100 = 54
    expect(computeQualityScore(225, 'normal', 450)).toBe(54);
  });

  it('folds in stability when motion was tracked (empty = still)', () => {
    // 3-term: ds=1*0.5 + ms(fresh=1)*0.3 + ss(still=1)*0.2 = 1.0 -> 100
    expect(computeQualityScore(450, 'fresh', 450, [])).toBe(100);
  });

  it('restless night lowers the score vs a still one', () => {
    const still = computeQualityScore(450, 'fresh', 450, []);
    const restless = computeQualityScore(
      450,
      'fresh',
      450,
      Array.from({ length: 60 }, (_, i) => ({ t: i, magnitude: 2 })),
    );
    expect(restless).toBeLessThan(still);
  });

  it('on-target + groggy + still night', () => {
    // ds=1*0.5 + ms(groggy=0.3)*0.3 + ss=1*0.2 = 0.79 -> 79
    expect(computeQualityScore(450, 'groggy', 450, [])).toBe(79);
  });
});

describe('isQualityConfirmed', () => {
  const base: SleepSession = {
    id: '1',
    startedAt: '2026-06-19T23:00:00.000Z',
    endedAt: '2026-06-20T06:30:00.000Z',
    durationMin: 450,
  };
  it('false without mood/score', () => {
    expect(isQualityConfirmed(base)).toBe(false);
  });
  it('true once mood + score present', () => {
    expect(
      isQualityConfirmed({ ...base, mood: 'fresh', qualityScore: 100 }),
    ).toBe(true);
  });
});
