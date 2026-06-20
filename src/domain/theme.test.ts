import { describe, expect, it } from 'vitest';
import { todaysTheme } from './theme';
import type { SleepSession } from './types';

const NOW = new Date(2026, 5, 20, 9, 0);

function mk(wake: Date, theme?: string): SleepSession {
  return {
    id: `${wake.getTime()}`,
    startedAt: new Date(wake.getTime() - 8 * 3600000).toISOString(),
    endedAt: wake.toISOString(),
    durationMin: 480,
    ...(theme !== undefined ? { theme } : {}),
  };
}

describe('todaysTheme', () => {
  it('returns null with no sessions', () => {
    expect(todaysTheme([], NOW)).toBeNull();
  });

  it("returns today's theme", () => {
    const sessions = [mk(new Date(2026, 5, 20, 7, 0), '締め切りの構成を考える')];
    expect(todaysTheme(sessions, NOW)).toBe('締め切りの構成を考える');
  });

  it('ignores a themed session from a previous day', () => {
    const sessions = [mk(new Date(2026, 5, 19, 7, 0), '昨日のテーマ')];
    expect(todaysTheme(sessions, NOW)).toBeNull();
  });

  it('ignores a blank theme', () => {
    const sessions = [mk(new Date(2026, 5, 20, 7, 0), '   ')];
    expect(todaysTheme(sessions, NOW)).toBeNull();
  });

  it('picks the latest wake when several are from today', () => {
    const sessions = [
      mk(new Date(2026, 5, 20, 6, 0), '早い方'),
      mk(new Date(2026, 5, 20, 8, 0), '遅い方'),
    ];
    expect(todaysTheme(sessions, NOW)).toBe('遅い方');
  });
});
