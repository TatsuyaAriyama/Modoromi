import { describe, expect, it } from 'vitest';
import {
  SHARP_FAST_MS,
  SHARP_SLOW_MS,
  buildResult,
  buildSharpnessSeries,
  latestResult,
  sharpnessAgreement,
  sharpnessScore,
  sharpnessTier,
  type SharpnessResult,
} from './sharpness';
import type { ConditionPoint } from './conditionSeries';

describe('sharpnessScore', () => {
  it('maps fast reactions high and slow reactions low', () => {
    expect(sharpnessScore(SHARP_FAST_MS)).toBe(100);
    expect(sharpnessScore(SHARP_SLOW_MS)).toBe(0);
    expect(sharpnessScore(150)).toBe(100); // clamps above the fast bound
    expect(sharpnessScore(700)).toBe(0); // clamps below the slow bound
  });

  it('is monotonic — faster never scores lower', () => {
    expect(sharpnessScore(300)).toBeGreaterThan(sharpnessScore(400));
  });
});

describe('sharpnessTier', () => {
  it('buckets by score', () => {
    expect(sharpnessTier(85)).toBe('sharp');
    expect(sharpnessTier(55)).toBe('steady');
    expect(sharpnessTier(20)).toBe('foggy');
  });
});

describe('buildResult', () => {
  it('uses the median and drops anticipatory taps', () => {
    const r = buildResult([260, 240, 50, 280], new Date(2026, 5, 21, 7, 0), 'r1');
    expect(r).not.toBeNull();
    expect(r?.trials).toBe(3); // 50ms dropped
    expect(r?.medianMs).toBe(260);
    expect(r?.bestMs).toBe(240);
    expect(r?.score).toBe(sharpnessScore(260));
  });

  it('returns null when nothing is valid', () => {
    expect(buildResult([40, 90], new Date(), 'x')).toBeNull();
    expect(buildResult([], new Date(), 'x')).toBeNull();
  });
});

describe('latestResult', () => {
  it('returns the most recent by takenAt', () => {
    const a: SharpnessResult = {
      id: 'a', takenAt: '2026-06-19T07:00:00.000Z', medianMs: 300, bestMs: 280, trials: 5, score: 73,
    };
    const b: SharpnessResult = {
      id: 'b', takenAt: '2026-06-21T07:00:00.000Z', medianMs: 250, bestMs: 230, trials: 5, score: 90,
    };
    expect(latestResult([a, b])?.id).toBe('b');
    expect(latestResult([])).toBeNull();
  });
});

function result(takenAt: string, score: number): SharpnessResult {
  return { id: takenAt, takenAt, medianMs: 300, bestMs: 280, trials: 5, score };
}

describe('buildSharpnessSeries', () => {
  it('aligns to the day grid and averages same-day checks', () => {
    const now = new Date(2026, 5, 21, 9, 0);
    const series = buildSharpnessSeries(
      [
        result('2026-06-21T07:00:00.000', 80),
        result('2026-06-21T08:00:00.000', 90), // same day → avg 85
        result('2026-06-19T07:00:00.000', 60),
      ],
      7,
      now,
      'en',
    );
    expect(series).toHaveLength(7);
    expect(series.at(-1)?.score).toBe(85); // today
    // a day with no check is a gap
    expect(series.some((p) => p.score == null)).toBe(true);
  });
});

describe('sharpnessAgreement', () => {
  function cond(key: string, index: number | null): ConditionPoint {
    return { key, label: key, index };
  }

  it('returns null below the minimum paired days', () => {
    const res = [result('2026-06-21T07:00:00.000', 80)];
    const con = [cond('2026-06-21', 70)];
    expect(sharpnessAgreement(res, con)).toBeNull();
  });

  it('reports a high correlation when measured tracks estimated', () => {
    const days = ['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21'];
    const scores = [40, 55, 65, 80, 95];
    const res = days.map((d, i) => result(`${d}T07:00:00.000`, scores[i]));
    const con = days.map((d, i) => cond(d, scores[i] - 5)); // condition tracks sharpness
    const a = sharpnessAgreement(res, con);
    expect(a).not.toBeNull();
    expect(a?.n).toBe(5);
    expect(a?.corr).toBeGreaterThan(0.9);
    expect(a?.level).toBe('aligned');
  });

  it('ignores days missing either signal', () => {
    const res = [
      result('2026-06-18T07:00:00.000', 50),
      result('2026-06-19T07:00:00.000', 60),
      result('2026-06-20T07:00:00.000', 70),
      result('2026-06-21T07:00:00.000', 80),
    ];
    const con = [
      cond('2026-06-18', 52),
      cond('2026-06-19', null), // no condition that day
      cond('2026-06-20', 68),
      cond('2026-06-21', 82),
    ];
    // only 3 paired days → below the minimum
    expect(sharpnessAgreement(res, con)).toBeNull();
  });
});
