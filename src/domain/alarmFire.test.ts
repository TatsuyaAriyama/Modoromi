import { describe, expect, it } from 'vitest';
import type { AlarmConfig } from './types';
import {
  armAlarm,
  expireOneShots,
  isAlarmDue,
  nextAlarmDate,
  nextAlarmFor,
  nextOccurrence,
} from './alarmFire';

function alarm(over: Partial<AlarmConfig> = {}): AlarmConfig {
  return {
    id: 'a',
    time: '07:00',
    repeatDays: [],
    sound: 'default',
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
    ...over,
  };
}

describe('nextAlarmDate', () => {
  it('rolls to the next morning when the time has already passed today', () => {
    const start = new Date(2026, 5, 20, 23, 0); // 23:00
    const d = nextAlarmDate('07:00', start);
    expect(d.getDate()).toBe(21);
    expect(d.getHours()).toBe(7);
  });

  it('stays today when the time is still ahead', () => {
    const start = new Date(2026, 5, 20, 23, 0);
    const d = nextAlarmDate('23:30', start);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(30);
  });
});

describe('isAlarmDue', () => {
  const start = new Date(2026, 5, 20, 23, 0);

  it('is not due right after the session starts', () => {
    expect(isAlarmDue('07:00', start, new Date(2026, 5, 20, 23, 1))).toBe(false);
  });

  it('is not due one minute before the alarm', () => {
    expect(isAlarmDue('07:00', start, new Date(2026, 5, 21, 6, 59))).toBe(false);
  });

  it('is due once the alarm time is reached', () => {
    expect(isAlarmDue('07:00', start, new Date(2026, 5, 21, 7, 0))).toBe(true);
  });

  it('handles a late-evening alarm the same night', () => {
    expect(isAlarmDue('23:30', start, new Date(2026, 5, 20, 23, 30))).toBe(true);
  });

  it('accepts an ISO string for the start time', () => {
    expect(isAlarmDue('07:00', start.toISOString(), new Date(2026, 5, 21, 7, 0))).toBe(
      true,
    );
  });
});

describe('nextOccurrence', () => {
  it('treats an empty repeatDays as the next wall-clock occurrence', () => {
    const from = new Date(2026, 6, 18, 23, 0); // Sat 23:00
    const d = nextOccurrence(alarm(), from)!;
    expect(d.getDate()).toBe(19);
    expect(d.getHours()).toBe(7);
  });

  it('skips to the next matching weekday', () => {
    // Mon-only 06:30, asked from Tue evening → the following Monday.
    const from = new Date(2026, 6, 21, 23, 0); // Tue 2026-07-21
    const d = nextOccurrence(alarm({ time: '06:30', repeatDays: [1] }), from)!;
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(27);
  });

  it('returns today when the time is still ahead on a matching day', () => {
    const from = new Date(2026, 6, 20, 5, 0); // Mon 05:00
    const d = nextOccurrence(alarm({ time: '06:30', repeatDays: [1] }), from)!;
    expect(d.getDate()).toBe(20);
  });
});

describe('nextAlarmFor', () => {
  it('picks the alarm that actually fires next, not the earliest clock time', () => {
    // Sat 23:30: the weekday 06:30 sorts first as a string, but the weekend
    // 09:00 is the one that will really ring.
    const from = new Date(2026, 6, 18, 23, 30); // Sat
    const weekday = alarm({ id: 'w', time: '06:30', repeatDays: [1, 2, 3, 4, 5] });
    const weekend = alarm({ id: 'e', time: '09:00', repeatDays: [0, 6] });
    const next = nextAlarmFor([weekday, weekend], from)!;
    expect(next.alarm.id).toBe('e');
    expect(new Date(next.at).getDay()).toBe(0); // Sunday
    expect(new Date(next.at).getHours()).toBe(9);
  });

  it('ignores disabled alarms', () => {
    const from = new Date(2026, 6, 18, 23, 30);
    expect(nextAlarmFor([alarm({ enabled: false })], from)).toBeNull();
  });

  it('returns null when there are no alarms at all', () => {
    expect(nextAlarmFor([], new Date(2026, 6, 18, 23, 30))).toBeNull();
  });
});

describe('armAlarm / expireOneShots', () => {
  it('arms a one-shot to its next instant and leaves repeats alone', () => {
    const now = new Date(2026, 6, 18, 23, 0);
    expect(armAlarm(alarm(), now).firesAt).toBe(
      new Date(2026, 6, 19, 7, 0).toISOString(),
    );
    expect(armAlarm(alarm({ repeatDays: [1] }), now).firesAt).toBeUndefined();
  });

  it('retires a one-shot once its instant has passed', () => {
    const fired = alarm({ firesAt: new Date(2026, 6, 18, 7, 0).toISOString() });
    const [out] = expireOneShots([fired], new Date(2026, 6, 18, 9, 0));
    expect(out.enabled).toBe(false);
  });

  it('leaves a one-shot armed for the future, and every repeating alarm', () => {
    const pending = alarm({ firesAt: new Date(2026, 6, 20, 7, 0).toISOString() });
    const repeating = alarm({ id: 'r', repeatDays: [1, 2] });
    const now = new Date(2026, 6, 18, 9, 0);
    expect(expireOneShots([pending, repeating], now).every((a) => a.enabled)).toBe(
      true,
    );
  });
});
