import { describe, expect, it } from 'vitest';
import {
  debtStatus,
  dayKey,
  lastSession,
  sessionsByWakeDay,
  sleepDebtMin,
} from './debt';
import type { SleepSession } from './types';

function session(endedAt: string, durationMin: number): SleepSession {
  const end = new Date(endedAt);
  const start = new Date(end.getTime() - durationMin * 60000);
  return {
    id: endedAt,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMin,
  };
}

describe('dayKey', () => {
  it('formats local date', () => {
    expect(dayKey(new Date(2026, 5, 20, 6, 30))).toBe('2026-06-20');
  });
});

describe('sessionsByWakeDay', () => {
  it('sums durations by wake day', () => {
    const map = sessionsByWakeDay([
      session('2026-06-20T06:30:00', 400),
      session('2026-06-20T14:00:00', 60), // nap same day
      session('2026-06-19T07:00:00', 420),
    ]);
    expect(map.get('2026-06-20')).toBe(460);
    expect(map.get('2026-06-19')).toBe(420);
  });
});

describe('sleepDebtMin', () => {
  const now = new Date(2026, 5, 20, 12, 0); // noon, fixed
  it('zero debt when every day hits target', () => {
    const sessions: SleepSession[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(6, 30, 0, 0);
      sessions.push(session(d.toISOString(), 450));
    }
    expect(sleepDebtMin(sessions, 450, 7, now)).toBe(0);
  });
  it('no logged days => zero debt (un-logged days are skipped)', () => {
    expect(sleepDebtMin([], 450, 7, now)).toBe(0);
  });
  it('accumulates shortfall only over logged days', () => {
    const today = new Date(now);
    today.setHours(6, 30, 0, 0);
    // one logged day with 400 of 450 = 50 debt; other 6 days un-logged, skipped
    expect(sleepDebtMin([session(today.toISOString(), 400)], 450, 7, now)).toBe(
      50,
    );
  });
  it('can go negative when over-sleeping logged days', () => {
    const today = new Date(now);
    today.setHours(8, 0, 0, 0);
    expect(sleepDebtMin([session(today.toISOString(), 500)], 450, 7, now)).toBe(
      -50,
    );
  });
  it('counts imported nights — they are real sleep, just from Health', () => {
    const today = new Date(now);
    today.setHours(6, 30, 0, 0);
    const imported: SleepSession = {
      ...session(today.toISOString(), 480),
      imported: true,
    };
    // 480 of 450 target on the one logged day → −30 (a surplus), proving the
    // imported night is included in the duration-based debt.
    expect(sleepDebtMin([imported], 450, 7, now)).toBe(-30);
  });
});

describe('lastSession', () => {
  it('returns the latest by endedAt', () => {
    const a = session('2026-06-18T06:00:00', 400);
    const b = session('2026-06-20T06:00:00', 400);
    const c = session('2026-06-19T06:00:00', 400);
    expect(lastSession([a, b, c])?.id).toBe(b.id);
  });
  it('undefined for empty', () => {
    expect(lastSession([])).toBeUndefined();
  });
});

describe('debtStatus', () => {
  it('buckets', () => {
    expect(debtStatus(0)).toBe('good');
    expect(debtStatus(60)).toBe('mild');
    expect(debtStatus(300)).toBe('notable');
  });
});
