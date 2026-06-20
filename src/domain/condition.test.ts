import { describe, expect, it } from 'vitest';
import { conditionTier, thinkingCondition } from './condition';

describe('conditionTier', () => {
  it('buckets the index', () => {
    expect(conditionTier(80)).toBe('sharp');
    expect(conditionTier(60)).toBe('steady');
    expect(conditionTier(40)).toBe('foggy');
    expect(conditionTier(20)).toBe('depleted');
  });
});

describe('thinkingCondition', () => {
  it('mirrors quality when debt and regularity are neutral', () => {
    const c = thinkingCondition({
      lastQuality: 80,
      debtMin: 0,
      consistency: 0.5,
    });
    expect(c.index).toBe(80);
    expect(c.tier).toBe('sharp');
  });

  it('uses a neutral base when quality is unconfirmed', () => {
    const c = thinkingCondition({
      lastQuality: null,
      debtMin: 0,
      consistency: 0.5,
    });
    expect(c.index).toBe(60);
  });

  it('penalises sleep debt, capped at 30', () => {
    // 90 min debt -> 6 pts off.
    expect(
      thinkingCondition({ lastQuality: 80, debtMin: 90, consistency: 0.5 })
        .index,
    ).toBe(74);
    // Huge debt clamps the penalty at 30.
    expect(
      thinkingCondition({ lastQuality: 80, debtMin: 6000, consistency: 0.5 })
        .index,
    ).toBe(50);
  });

  it('rewards high regularity and punishes low', () => {
    const high = thinkingCondition({
      lastQuality: 70,
      debtMin: 0,
      consistency: 1,
    }).index;
    const low = thinkingCondition({
      lastQuality: 70,
      debtMin: 0,
      consistency: 0,
    }).index;
    expect(high).toBe(80); // +10
    expect(low).toBe(60); // -10
  });

  it('ignores negative debt (oversleep is not a penalty)', () => {
    expect(
      thinkingCondition({ lastQuality: 70, debtMin: -120, consistency: 0.5 })
        .index,
    ).toBe(70);
  });

  it('clamps to the 0–100 range', () => {
    const c = thinkingCondition({
      lastQuality: 10,
      debtMin: 6000,
      consistency: 0,
    });
    expect(c.index).toBeGreaterThanOrEqual(0);
    expect(c.tier).toBe('depleted');
  });
});
