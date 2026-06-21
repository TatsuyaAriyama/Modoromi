import { describe, expect, it } from 'vitest';
import {
  BOX_BREATH,
  FOUR_SEVEN_EIGHT,
  MIN_SCALE,
  breathAt,
  breathPattern,
} from './breath';

describe('breathAt', () => {
  it('starts at full exhale (smallest orb) on inhale', () => {
    const s = breathAt(0);
    expect(s.phase).toBe('inhale');
    expect(s.scale).toBeCloseTo(MIN_SCALE);
    expect(s.cycle).toBe(0);
  });

  it('reaches full inhale at the top of the breath', () => {
    const s = breathAt(BOX_BREATH.inhaleMs);
    expect(s.phase).toBe('hold-in');
    expect(s.scale).toBeCloseTo(1);
  });

  it('holds large through the inhale-hold', () => {
    const s = breathAt(BOX_BREATH.inhaleMs + BOX_BREATH.holdInMs / 2);
    expect(s.phase).toBe('hold-in');
    expect(s.scale).toBeCloseTo(1);
  });

  it('shrinks back toward the floor while exhaling', () => {
    const start = BOX_BREATH.inhaleMs + BOX_BREATH.holdInMs;
    const s = breathAt(start + BOX_BREATH.exhaleMs / 2);
    expect(s.phase).toBe('exhale');
    expect(s.scale).toBeLessThan(1);
    expect(s.scale).toBeGreaterThan(MIN_SCALE);
  });

  it('holds at the floor through the exhale-hold', () => {
    const start =
      BOX_BREATH.inhaleMs + BOX_BREATH.holdInMs + BOX_BREATH.exhaleMs;
    const s = breathAt(start + BOX_BREATH.holdOutMs / 2);
    expect(s.phase).toBe('hold-out');
    expect(s.scale).toBeCloseTo(MIN_SCALE);
  });

  it('counts a completed cycle after one full loop', () => {
    const cycleMs =
      BOX_BREATH.inhaleMs +
      BOX_BREATH.holdInMs +
      BOX_BREATH.exhaleMs +
      BOX_BREATH.holdOutMs;
    expect(breathAt(cycleMs).cycle).toBe(1);
    expect(breathAt(cycleMs * 3 + 10).cycle).toBe(3);
    expect(breathAt(cycleMs).phase).toBe('inhale');
  });

  it('clamps negative time to the start', () => {
    const s = breathAt(-500);
    expect(s.phase).toBe('inhale');
    expect(s.cycle).toBe(0);
  });
});

describe('4-7-8 pattern', () => {
  it('holds longer than it inhales, then exhales longest', () => {
    expect(FOUR_SEVEN_EIGHT.holdInMs).toBeGreaterThan(FOUR_SEVEN_EIGHT.inhaleMs);
    expect(FOUR_SEVEN_EIGHT.exhaleMs).toBeGreaterThan(FOUR_SEVEN_EIGHT.holdInMs);
    expect(FOUR_SEVEN_EIGHT.holdOutMs).toBe(0);
  });

  it('skips straight from exhale into the next inhale (no hold-out)', () => {
    const cycleMs =
      FOUR_SEVEN_EIGHT.inhaleMs +
      FOUR_SEVEN_EIGHT.holdInMs +
      FOUR_SEVEN_EIGHT.exhaleMs +
      FOUR_SEVEN_EIGHT.holdOutMs;
    expect(breathAt(cycleMs, FOUR_SEVEN_EIGHT).cycle).toBe(1);
    expect(breathAt(cycleMs, FOUR_SEVEN_EIGHT).phase).toBe('inhale');
  });
});

describe('breathPattern', () => {
  it('resolves known ids and falls back to box for unknown', () => {
    expect(breathPattern('fourSevenEight').config).toBe(FOUR_SEVEN_EIGHT);
    expect(breathPattern('box').config).toBe(BOX_BREATH);
    expect(breathPattern('nope').config).toBe(BOX_BREATH);
    expect(breathPattern(undefined).config).toBe(BOX_BREATH);
  });
});
