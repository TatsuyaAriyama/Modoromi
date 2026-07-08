import { describe, expect, it } from 'vitest';
import { isAlarmDue, minutesUntilAlarm, nextAlarmDate } from './alarmFire';

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

describe('minutesUntilAlarm', () => {
  // 2026-06-20 is a Saturday.
  const SAT_NOON = new Date(2026, 5, 20, 12, 0);

  it('counts to a one-shot later today', () => {
    expect(minutesUntilAlarm('13:30', [], SAT_NOON)).toBe(90);
  });

  it('rolls a passed one-shot to tomorrow', () => {
    expect(minutesUntilAlarm('07:00', [], SAT_NOON)).toBe(19 * 60);
  });

  it('waits for the repeat weekday (Mon from Saturday noon)', () => {
    // Sat 12:00 → Mon 07:00 = 43h.
    expect(minutesUntilAlarm('07:00', [1], SAT_NOON)).toBe(43 * 60);
  });

  it('fires today when the repeat weekday matches and time is ahead', () => {
    expect(minutesUntilAlarm('23:00', [6], SAT_NOON)).toBe(11 * 60);
  });
});
