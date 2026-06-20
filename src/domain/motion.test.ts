import { describe, expect, it } from 'vitest';
import {
  RESTLESS_PER_HOUR,
  magnitude,
  movementsPerHour,
  shouldSmartWake,
  stabilityScore,
} from './motion';
import type { Movement } from './types';

describe('magnitude', () => {
  it('is the euclidean norm', () => {
    expect(magnitude(3, 4, 0)).toBe(5);
    expect(magnitude(0, 0, 0)).toBe(0);
  });
});

describe('movementsPerHour', () => {
  it('scales count by duration', () => {
    expect(movementsPerHour(6, 60)).toBe(6);
    expect(movementsPerHour(6, 120)).toBe(3);
  });
  it('guards zero/negative duration', () => {
    expect(movementsPerHour(5, 0)).toBe(0);
  });
});

describe('stabilityScore', () => {
  it('is 1 for a perfectly still night', () => {
    expect(stabilityScore(0, 450)).toBe(1);
  });
  it('reaches 0 at the restless density', () => {
    // RESTLESS_PER_HOUR per hour over an 8h night.
    expect(stabilityScore(RESTLESS_PER_HOUR * 8, 480)).toBe(0);
  });
  it('clamps below zero', () => {
    expect(stabilityScore(1000, 60)).toBe(0);
  });
  it('is linear in between', () => {
    // Half the restless density over one hour -> 0.5.
    expect(stabilityScore(RESTLESS_PER_HOUR / 2, 60)).toBeCloseTo(0.5, 5);
  });
});

describe('shouldSmartWake', () => {
  const move = (t: number): Movement => ({ t, magnitude: 2 });

  it('does not wake before the window opens', () => {
    expect(
      shouldSmartWake({
        movements: [move(100), move(101)],
        elapsedMin: 102,
        minutesToAlarm: 45,
        windowMin: 30,
      }),
    ).toBe(false);
  });

  it('wakes at/after the alarm boundary regardless of movement', () => {
    expect(
      shouldSmartWake({
        movements: [],
        elapsedMin: 480,
        minutesToAlarm: 0,
        windowMin: 30,
      }),
    ).toBe(true);
  });

  it('wakes inside the window on recent movement (light sleep)', () => {
    expect(
      shouldSmartWake({
        movements: [move(458), move(460)],
        elapsedMin: 460,
        minutesToAlarm: 20,
        windowMin: 30,
      }),
    ).toBe(true);
  });

  it('stays asleep inside the window when still', () => {
    expect(
      shouldSmartWake({
        movements: [move(100)], // long ago
        elapsedMin: 460,
        minutesToAlarm: 20,
        windowMin: 30,
      }),
    ).toBe(false);
  });
});
