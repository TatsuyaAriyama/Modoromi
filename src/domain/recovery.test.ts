import { describe, expect, it } from 'vitest';
import { MAX_RECOVERABLE_MIN, recoverSession } from './recovery';
import type { Movement } from './types';

const marker = (startedAt: string) => ({ sessionId: 'sess-1', startedAt });

describe('recoverSession', () => {
  it('reconstructs an interrupted session with recovered movements', () => {
    const start = '2026-06-21T23:00:00.000Z';
    const now = new Date('2026-06-22T06:30:00.000Z'); // +7.5h
    const movements: Movement[] = [{ t: 60, magnitude: 3 }];
    const s = recoverSession({ marker: marker(start), now, movements, recovered: true });
    expect(s).not.toBeNull();
    expect(s?.id).toBe('sess-1');
    expect(s?.durationMin).toBe(450);
    expect(s?.recovered).toBe(true);
    expect(s?.motionSource).toBe('native');
    expect(s?.movements).toEqual(movements);
  });

  it('stores an unrecoverable night as untracked, not falsely still', () => {
    const s = recoverSession({
      marker: marker('2026-06-21T23:00:00.000Z'),
      now: new Date('2026-06-22T06:00:00.000Z'),
      recovered: false,
    });
    expect(s?.motionSource).toBe('none');
    expect(s?.movements).toBeUndefined();
  });

  it('discards a stale marker (gap longer than a night)', () => {
    const start = '2026-06-19T23:00:00.000Z';
    const now = new Date('2026-06-21T09:00:00.000Z'); // ~34h later
    expect(
      recoverSession({ marker: marker(start), now, recovered: false }),
    ).toBeNull();
  });

  it('rejects a non-positive duration', () => {
    const start = '2026-06-21T07:00:00.000Z';
    const now = new Date('2026-06-21T07:00:00.000Z');
    expect(
      recoverSession({ marker: marker(start), now, recovered: true }),
    ).toBeNull();
  });

  it('rejects an unparseable start', () => {
    expect(
      recoverSession({ marker: marker('not-a-date'), now: new Date(), recovered: true }),
    ).toBeNull();
  });

  it('keeps a session right at the recovery limit', () => {
    const start = new Date('2026-06-21T00:00:00.000Z');
    const now = new Date(start.getTime() + MAX_RECOVERABLE_MIN * 60000);
    const s = recoverSession({
      marker: marker(start.toISOString()),
      now,
      recovered: true,
    });
    expect(s?.durationMin).toBe(MAX_RECOVERABLE_MIN);
  });
});
