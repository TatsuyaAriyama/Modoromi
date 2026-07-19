// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  alarmRepo,
  clearFaults,
  dataFaults,
  exportAll,
  importAll,
  sleepRepo,
} from './repositories';
import { resetQueues } from './keyQueue';
import type { AlarmConfig, SleepSession } from '../domain/types';

/**
 * The Capacitor Preferences web fallback persists to localStorage, so these
 * exercise the real read-modify-write path with no mocks.
 *
 * Every mutation below is issued in ONE tick without awaiting, which is what
 * the app itself does (the alarm row toggle fires `void saveAlarm(...)` per
 * tap). Before serialization each call read the same pre-change list and the
 * last write won, so N saves left exactly one survivor.
 */
function alarm(id: string): AlarmConfig {
  return {
    id,
    time: '07:00',
    repeatDays: [],
    sound: 'default',
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
  };
}

function night(id: string): SleepSession {
  return {
    id,
    startedAt: '2026-07-18T23:00:00',
    endedAt: '2026-07-19T07:00:00',
    durationMin: 480,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetQueues();
  clearFaults();
});

describe('repository writes are serialized', () => {
  it('keeps every alarm when saves are issued in the same tick', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    await Promise.all(ids.map((id) => alarmRepo.save(alarm(id))));
    expect((await alarmRepo.all()).map((a) => a.id).sort()).toEqual(ids);
  });

  it('keeps every night when saves are issued in the same tick', async () => {
    const ids = ['n1', 'n2', 'n3', 'n4'];
    await Promise.all(ids.map((id) => sleepRepo.save(night(id))));
    expect((await sleepRepo.all()).map((s) => s.id).sort()).toEqual(ids);
  });

  it('applies a save and a remove issued together in order', async () => {
    await alarmRepo.save(alarm('keep'));
    const writes = [alarmRepo.save(alarm('doomed')), alarmRepo.remove('doomed')];
    await Promise.all(writes);
    expect((await alarmRepo.all()).map((a) => a.id)).toEqual(['keep']);
  });

  it('does not let one failed write break the rest of the chain', async () => {
    // A value JSON cannot serialize makes this single write throw.
    const circular = alarm('bad') as AlarmConfig & { self?: unknown };
    circular.self = circular;
    const results = await Promise.allSettled([
      alarmRepo.save(circular),
      alarmRepo.save(alarm('good')),
    ]);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('fulfilled');
    expect((await alarmRepo.all()).map((a) => a.id)).toEqual(['good']);
  });

  it('never exports a mix of old and new state', async () => {
    await alarmRepo.save(alarm('old'));
    await sleepRepo.save(night('old'));

    // An import racing an export must yield one coherent world, not a blend.
    const [json] = await Promise.all([
      exportAll(),
      importAll({ sessions: [night('new')], alarms: [alarm('new')], settings: null }),
    ]);
    const blob = JSON.parse(json) as {
      sessions: SleepSession[];
      alarms: AlarmConfig[];
    };
    const sessionIds = blob.sessions.map((s) => s.id);
    const alarmIds = blob.alarms.map((a) => a.id);
    expect(sessionIds).toEqual(alarmIds); // both ['old'] or both ['new']
  });
});

describe('a read that cannot be trusted never becomes a deletion', () => {
  const KEY = 'CapacitorStorage.madoromi.sessions';
  const QKEY = 'CapacitorStorage.madoromi.quarantine.madoromi.sessions';

  it('quarantines an unparseable log instead of reporting it empty-and-fine', async () => {
    localStorage.setItem(KEY, '{"sessions": [ truncated mid-writ');
    expect(await sleepRepo.all()).toEqual([]);

    // The bytes survive, and the live key is retired so the next write cannot
    // silently cement the emptiness.
    expect(localStorage.getItem(QKEY)).toBe('{"sessions": [ truncated mid-writ');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(dataFaults()).toEqual([
      { key: 'sessions', reason: 'unparseable', dropped: 0 },
    ]);
  });

  it('quarantines a blob of the wrong shape', async () => {
    localStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    expect(await sleepRepo.all()).toEqual([]);
    expect(dataFaults()[0].reason).toBe('wrong-shape');
    expect(localStorage.getItem(QKEY)).not.toBeNull();
  });

  it('keeps the good nights, counts the bad ones, and preserves the original', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([night('good'), { id: 'bad', durationMin: 'eight hours' }]),
    );
    expect((await sleepRepo.all()).map((s) => s.id)).toEqual(['good']);
    expect(dataFaults()).toEqual([
      { key: 'sessions', reason: 'partial', dropped: 1 },
    ]);
    // The dropped night is still recoverable from the quarantined original.
    expect(localStorage.getItem(QKEY)).toContain('eight hours');
  });

  it('treats an absent key as empty, with no fault', async () => {
    expect(await sleepRepo.all()).toEqual([]);
    expect(dataFaults()).toEqual([]);
    expect(localStorage.getItem(QKEY)).toBeNull();
  });
});
