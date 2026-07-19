import { describe, expect, it } from 'vitest';
import {
  RESTLESS_LEVELS,
  RESTLESS_PER_HOUR,
  magnitude,
  movementHistogram,
  movementsPerHour,
  restlessnessLevel,
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

describe('restlessnessLevel', () => {
  it('reads a perfectly still night as "still"', () => {
    expect(restlessnessLevel(0, 450)).toBe('still');
  });
  it('treats density at the still bound as "still"', () => {
    // RESTLESS_LEVELS.still per hour over one hour.
    expect(restlessnessLevel(RESTLESS_LEVELS.still, 60)).toBe('still');
  });
  it('reads moderate density as "calm"', () => {
    // Between the still and calm bounds (per hour).
    expect(restlessnessLevel(RESTLESS_LEVELS.calm, 60)).toBe('calm');
  });
  it('reads high density as "restless"', () => {
    expect(restlessnessLevel(RESTLESS_LEVELS.calm + 1, 60)).toBe('restless');
  });
  it('guards zero duration as "still"', () => {
    expect(restlessnessLevel(5, 0)).toBe('still');
  });
});

describe('movementHistogram', () => {
  const move = (t: number): Movement => ({ t, magnitude: 2 });

  it('returns a zero-filled array of the requested size with no data', () => {
    expect(movementHistogram([], 480, 6)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it('returns zeros for non-positive duration', () => {
    expect(movementHistogram([move(10)], 0, 4)).toEqual([0, 0, 0, 0]);
  });
  it('places movements in the right time bin', () => {
    // 60-minute night, 12 bins (5 min each): t=0 → bin 0, t=30 → bin 6,
    // t=59 → bin 11.
    const hist = movementHistogram([move(0), move(30), move(59)], 60, 12);
    expect(hist[0]).toBe(1);
    expect(hist[6]).toBe(1);
    expect(hist[11]).toBe(1);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(3);
  });
  it('clamps movements past the night end into the last bin', () => {
    const hist = movementHistogram([move(500)], 480, 8);
    expect(hist[7]).toBe(1);
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

describe('shouldSmartWake settling floor', () => {
  const movements = [{ t: 10, magnitude: 2 }, { t: 11, magnitude: 2 }];

  it('does not fire from the movements of settling into bed', () => {
    // Session started 12 min ago, alarm 20 min away, window 30: inside the
    // window and moving, but this is someone putting the phone down.
    expect(
      shouldSmartWake({ movements, elapsedMin: 12, minutesToAlarm: 20, windowMin: 30 }),
    ).toBe(false);
  });

  it('fires on the same signal once the night is under way', () => {
    const late = [{ t: 400, magnitude: 2 }, { t: 401, magnitude: 2 }];
    expect(
      shouldSmartWake({ movements: late, elapsedMin: 402, minutesToAlarm: 20, windowMin: 30 }),
    ).toBe(true);
  });

  it('still honours the hard alarm boundary on a short session', () => {
    // The floor must never be able to suppress the alarm itself.
    expect(
      shouldSmartWake({ movements: [], elapsedMin: 5, minutesToAlarm: 0, windowMin: 30 }),
    ).toBe(true);
  });
});
