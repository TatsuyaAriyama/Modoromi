import { describe, expect, it } from 'vitest';
import {
  MAX_RECOVERY_MIN,
  RECOVERY_NIGHTS,
  recommendedBedtime,
} from './bedtime';

const WAKE = '07:00';
const TARGET = 450; // 7h30m

describe('recommendedBedtime', () => {
  it('plans the plain target bedtime when there is no debt', () => {
    const p = recommendedBedtime({ wakeTime: WAKE, targetMin: TARGET, debtMin: 0 });
    expect(p.recoveryMin).toBe(0);
    expect(p.targetTonightMin).toBe(TARGET);
    expect(p.bedtimeHm).toBe('23:30');
    expect(p.debtMin).toBe(0);
  });

  it('clamps negative (surplus) debt to zero', () => {
    const p = recommendedBedtime({ wakeTime: WAKE, targetMin: TARGET, debtMin: -120 });
    expect(p.recoveryMin).toBe(0);
    expect(p.debtMin).toBe(0);
    expect(p.bedtimeHm).toBe('23:30');
  });

  it('pays back a quarter of the debt, rounded to 5 minutes', () => {
    // 120 / 4 = 30 → 30 min earlier than 23:30 → 23:00
    const p = recommendedBedtime({ wakeTime: WAKE, targetMin: TARGET, debtMin: 120 });
    expect(p.recoveryMin).toBe(30);
    expect(p.targetTonightMin).toBe(TARGET + 30);
    expect(p.bedtimeHm).toBe('23:00');
  });

  it('caps recovery so the night is never jarringly early', () => {
    const p = recommendedBedtime({
      wakeTime: WAKE,
      targetMin: TARGET,
      debtMin: 600, // 600/4 = 150, far above the cap
    });
    expect(p.recoveryMin).toBe(MAX_RECOVERY_MIN);
    expect(p.bedtimeHm).toBe('22:45');
  });

  it('spreads debt across multiple nights', () => {
    const debt = 80;
    const p = recommendedBedtime({ wakeTime: WAKE, targetMin: TARGET, debtMin: debt });
    // a single night never pays back more than ~1/RECOVERY_NIGHTS of the debt
    expect(p.recoveryMin).toBeLessThanOrEqual(debt / RECOVERY_NIGHTS + 5);
  });
});
