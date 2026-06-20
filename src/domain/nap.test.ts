import { describe, expect, it } from 'vitest';
import { POWER_NAP_MIN, SHORT_NAP_MIN, napAdvice } from './nap';

function at(hour: number): Date {
  return new Date(2026, 5, 20, hour, 0);
}

describe('napAdvice', () => {
  it('recommends a power nap in the early-afternoon dip', () => {
    const a = napAdvice({ now: at(13) });
    expect(a.window).toBe('ideal');
    expect(a.recommendedMin).toBe(POWER_NAP_MIN);
  });

  it('shifts the headline when sleep debt is high', () => {
    const low = napAdvice({ now: at(13), debtMin: 0 });
    const high = napAdvice({ now: at(13), debtMin: 120 });
    expect(high.headline).not.toBe(low.headline);
    expect(high.headline).toBe('idealRecover');
  });

  it('keeps the nap short in the late-afternoon caution window', () => {
    const a = napAdvice({ now: at(16) });
    expect(a.window).toBe('caution');
    expect(a.recommendedMin).toBe(SHORT_NAP_MIN);
  });

  it('discourages evening naps to protect the night', () => {
    const a = napAdvice({ now: at(20) });
    expect(a.window).toBe('discouraged');
    expect(a.recommendedMin).toBe(0);
    expect(a.headline).toBe('nightFirst');
  });

  it('discourages morning naps in favour of light', () => {
    const a = napAdvice({ now: at(8) });
    expect(a.window).toBe('discouraged');
    expect(a.headline).toBe('morningLight');
  });

  it('treats a negative debt as zero', () => {
    const a = napAdvice({ now: at(13), debtMin: -200 });
    expect(a.headline).not.toBe('idealRecover');
  });
});
