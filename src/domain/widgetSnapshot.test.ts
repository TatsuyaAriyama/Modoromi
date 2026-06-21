import { describe, expect, it } from 'vitest';
import { widgetSnapshot } from './widgetSnapshot';
import type { SleepSession } from './types';

const NOW = new Date('2026-06-21T08:00:00');

function session(
  endedAt: string,
  durationMin: number,
  extra: Partial<SleepSession> = {},
): SleepSession {
  const end = new Date(endedAt);
  const start = new Date(end.getTime() - durationMin * 60000);
  return {
    id: endedAt,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMin,
    ...extra,
  };
}

describe('widgetSnapshot', () => {
  it('returns a neutral, debt-free snapshot for an empty log', () => {
    const snap = widgetSnapshot([], 450, NOW);
    expect(snap.debtMin).toBe(0);
    expect(snap.lastQuality).toBeNull();
    // No quality, no debt, no regularity → neutral base.
    expect(snap.conditionIndex).toBe(60);
    expect(snap.tier).toBe('steady');
    expect(snap.debtStatus).toBe('good');
    expect(snap.hasData).toBe(false);
    expect(snap.updatedAt).toBe(NOW.toISOString());
  });

  it('surfaces last night\'s confirmed quality and accrued debt', () => {
    const sessions = [
      session('2026-06-21T07:00:00', 360, { mood: 'fresh', qualityScore: 78 }),
      session('2026-06-20T07:00:00', 360, { mood: 'fresh', qualityScore: 70 }),
    ];
    const snap = widgetSnapshot(sessions, 450, NOW);
    expect(snap.lastQuality).toBe(78);
    // Two nights 90 min under target each → 180 min debt.
    expect(snap.debtMin).toBe(180);
    expect(snap.debtStatus).toBe('mild');
    expect(snap.hasData).toBe(true);
  });

  it('treats an unconfirmed last night as having no quality', () => {
    // durationMin only, no mood/score → not quality-confirmed.
    const snap = widgetSnapshot(
      [session('2026-06-21T07:00:00', 450)],
      450,
      NOW,
    );
    expect(snap.lastQuality).toBeNull();
    expect(snap.conditionIndex).toBe(60);
  });

  it('debt drags the condition index below the quality base', () => {
    const sessions = [
      session('2026-06-21T07:00:00', 300, { mood: 'groggy', qualityScore: 80 }),
    ];
    const snap = widgetSnapshot(sessions, 450, NOW);
    // 150 min debt → 2.5h * 4 = 10pt penalty off the 80 base.
    expect(snap.conditionIndex).toBe(70);
    expect(snap.lastQuality).toBe(80);
  });
});
