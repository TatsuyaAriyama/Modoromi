import { describe, expect, it } from 'vitest';
import { sleepSampleFor } from './health';
import type { SleepSession } from '../domain/types';

function session(over: Partial<SleepSession> = {}): SleepSession {
  return {
    id: 's',
    startedAt: '2026-06-20T23:00:00.000Z',
    endedAt: '2026-06-21T07:00:00.000Z',
    durationMin: 480,
    ...over,
  };
}

describe('sleepSampleFor', () => {
  it('uses the recorded start and end instants', () => {
    const s = sleepSampleFor(session());
    expect(s).toEqual({
      startISO: '2026-06-20T23:00:00.000Z',
      endISO: '2026-06-21T07:00:00.000Z',
    });
  });

  it('derives the start from durationMin when start is after end', () => {
    const s = sleepSampleFor(
      session({ startedAt: '2026-06-21T08:00:00.000Z', durationMin: 60 }),
    );
    // End is 07:00Z, 60 min before that is 06:00Z.
    expect(s).toEqual({
      startISO: '2026-06-21T06:00:00.000Z',
      endISO: '2026-06-21T07:00:00.000Z',
    });
  });

  it('derives the start when the stored start is unparseable', () => {
    const s = sleepSampleFor(session({ startedAt: 'not-a-date', durationMin: 120 }));
    expect(s).toEqual({
      startISO: '2026-06-21T05:00:00.000Z',
      endISO: '2026-06-21T07:00:00.000Z',
    });
  });

  it('returns null when no valid window can be formed', () => {
    expect(sleepSampleFor(session({ endedAt: 'nope' }))).toBeNull();
    expect(
      sleepSampleFor(session({ startedAt: 'bad', durationMin: 0 })),
    ).toBeNull();
  });
});
