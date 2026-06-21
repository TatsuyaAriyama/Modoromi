import { describe, expect, it } from 'vitest';
import {
  clusterNights,
  sessionsFromHealth,
  type HealthSleepSample,
} from './healthImport';
import type { SleepSession } from './types';

function sample(startISO: string, endISO: string, value?: number): HealthSleepSample {
  return { startISO, endISO, ...(value != null ? { value } : {}) };
}

function localSession(startISO: string, endISO: string): SleepSession {
  return {
    id: `local-${startISO}`,
    startedAt: startISO,
    endedAt: endISO,
    durationMin: Math.round(
      (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000,
    ),
  };
}

describe('clusterNights', () => {
  it('merges near-adjacent segments into one night', () => {
    const nights = clusterNights([
      sample('2026-06-20T23:00:00.000Z', '2026-06-21T01:00:00.000Z'),
      sample('2026-06-21T01:10:00.000Z', '2026-06-21T03:00:00.000Z'), // 10m gap
      sample('2026-06-21T03:00:00.000Z', '2026-06-21T06:30:00.000Z'),
    ]);
    expect(nights).toHaveLength(1);
    expect(new Date(nights[0].start).toISOString()).toBe('2026-06-20T23:00:00.000Z');
    expect(new Date(nights[0].end).toISOString()).toBe('2026-06-21T06:30:00.000Z');
  });

  it('splits across a long gap into separate nights', () => {
    const nights = clusterNights([
      sample('2026-06-20T01:00:00.000Z', '2026-06-20T06:00:00.000Z'),
      sample('2026-06-20T23:00:00.000Z', '2026-06-21T05:00:00.000Z'), // next night
    ]);
    expect(nights).toHaveLength(2);
  });

  it('excludes awake segments from the window', () => {
    const nights = clusterNights([
      sample('2026-06-20T23:00:00.000Z', '2026-06-21T03:00:00.000Z'),
      // a long awake stretch that would otherwise bridge to a far segment
      sample('2026-06-21T03:00:00.000Z', '2026-06-21T09:00:00.000Z', 2),
      sample('2026-06-21T09:30:00.000Z', '2026-06-21T10:00:00.000Z'),
    ]);
    // awake dropped → the 03:00 night and the 09:30 segment are >60m apart
    expect(nights).toHaveLength(2);
  });

  it('drops zero/negative spans', () => {
    expect(
      clusterNights([sample('2026-06-21T05:00:00.000Z', '2026-06-21T05:00:00.000Z')]),
    ).toEqual([]);
  });
});

describe('sessionsFromHealth', () => {
  it('imports a night as a session marked imported', () => {
    const out = sessionsFromHealth(
      [sample('2026-06-20T23:00:00.000Z', '2026-06-21T06:30:00.000Z')],
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].imported).toBe(true);
    expect(out[0].durationMin).toBe(450);
    expect(out[0].id).toMatch(/^health:/);
  });

  it('skips nights that overlap an existing local session', () => {
    const existing = [
      localSession('2026-06-20T23:30:00.000Z', '2026-06-21T07:00:00.000Z'),
    ];
    const out = sessionsFromHealth(
      [sample('2026-06-20T23:00:00.000Z', '2026-06-21T06:30:00.000Z')],
      existing,
    );
    expect(out).toEqual([]);
  });

  it('drops clusters shorter than the minimum', () => {
    const out = sessionsFromHealth(
      [sample('2026-06-21T13:00:00.000Z', '2026-06-21T13:20:00.000Z')], // 20m
      [],
    );
    expect(out).toEqual([]);
  });

  it('is idempotent — re-importing yields nothing new', () => {
    const samples = [sample('2026-06-20T23:00:00.000Z', '2026-06-21T06:30:00.000Z')];
    const first = sessionsFromHealth(samples, []);
    const second = sessionsFromHealth(samples, first);
    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
  });
});
