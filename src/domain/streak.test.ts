import { describe, expect, it } from 'vitest';
import { loggedStreakDays } from './streak';
import type { SleepSession } from './types';

const NOW = new Date(2026, 5, 20, 9, 0);

function wake(daysAgo: number): SleepSession {
  const d = new Date(NOW);
  d.setDate(NOW.getDate() - daysAgo);
  d.setHours(7, 0, 0, 0);
  return {
    id: `s${daysAgo}`,
    startedAt: new Date(d.getTime() - 8 * 3600000).toISOString(),
    endedAt: d.toISOString(),
    durationMin: 480,
  };
}

describe('loggedStreakDays', () => {
  it('is zero with no records', () => {
    expect(loggedStreakDays([], NOW)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(loggedStreakDays([wake(0), wake(1), wake(2)], NOW)).toBe(3);
  });

  it("an unlogged today doesn't break the streak", () => {
    expect(loggedStreakDays([wake(1), wake(2)], NOW)).toBe(2);
  });

  it('a gap resets the count', () => {
    expect(loggedStreakDays([wake(0), wake(2), wake(3)], NOW)).toBe(1);
  });

  it('ignores duplicate sessions on one day', () => {
    expect(loggedStreakDays([wake(0), wake(0), wake(1)], NOW)).toBe(2);
  });
});
