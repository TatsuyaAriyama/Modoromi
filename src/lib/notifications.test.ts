import { describe, expect, it } from 'vitest';
import type { AlarmConfig, UserSettings } from '../domain/types';
import {
  ALARM_RING_MINUTES,
  ALARM_SOUND,
  MAX_PENDING,
  buildAlarmNotifications,
  buildBedtimeNotification,
} from './notifications';

function alarm(over: Partial<AlarmConfig> = {}): AlarmConfig {
  return {
    id: 'a1',
    time: '07:00',
    repeatDays: [],
    sound: 'default',
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
    ...over,
  };
}

const SETTINGS: UserSettings = {
  lang: 'en',
  theme: 'auto',
  targetDurationMin: 450,
  defaultWakeTime: '07:00',
  bedtimeReminder: true,
  onboarded: true,
  smartAlarm: false,
};

describe('buildAlarmNotifications', () => {
  it('skips disabled alarms', () => {
    expect(buildAlarmNotifications([alarm({ enabled: false })])).toHaveLength(0);
  });

  it('rings a one-shot alarm as a chained burst with the alarm sound', () => {
    const n = buildAlarmNotifications([alarm()]);
    expect(n).toHaveLength(ALARM_RING_MINUTES);
    expect(n.every((x) => x.sound === ALARM_SOUND)).toBe(true);
    // consecutive minutes 07:00, 07:01, 07:02 — and no weekday (one-shot)
    expect(n.map((x) => x.schedule?.on?.minute)).toEqual([0, 1, 2]);
    expect(n.every((x) => x.schedule?.on?.weekday === undefined)).toBe(true);
  });

  it('schedules a burst per repeat weekday with Capacitor weekday numbers', () => {
    const n = buildAlarmNotifications([alarm({ repeatDays: [1, 3] })]); // Mon, Wed
    expect(n).toHaveLength(2 * ALARM_RING_MINUTES);
    // domain 1=Mon → Capacitor 2; domain 3=Wed → Capacitor 4
    expect(new Set(n.map((x) => x.schedule?.on?.weekday))).toEqual(
      new Set([2, 4]),
    );
  });

  it('gives every notification a unique id', () => {
    const n = buildAlarmNotifications([
      alarm({ id: 'a', repeatDays: [0, 1, 2] }),
      alarm({ id: 'b', repeatDays: [3, 4] }),
    ]);
    const ids = n.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries past midnight, advancing the weekday', () => {
    // 23:58 +2min → 00:00 next day; domain Sat(6) → Sun(0) → Capacitor 1
    const n = buildAlarmNotifications([
      alarm({ time: '23:58', repeatDays: [6] }),
    ]);
    const last = n[n.length - 1];
    expect(last.schedule?.on?.hour).toBe(0);
    expect(last.schedule?.on?.minute).toBe(0);
    expect(last.schedule?.on?.weekday).toBe(1); // Sunday
  });

  it('never exceeds the OS pending ceiling', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      alarm({ id: 'x' + i, repeatDays: [0, 1, 2, 3, 4, 5, 6] }),
    );
    expect(buildAlarmNotifications(many).length).toBeLessThanOrEqual(
      MAX_PENDING,
    );
  });
});

describe('buildBedtimeNotification', () => {
  it('returns null when the reminder is off', () => {
    expect(
      buildBedtimeNotification({ ...SETTINGS, bedtimeReminder: false }, []),
    ).toBeNull();
  });

  it('fires at the recovery-aware bedtime with no debt', () => {
    const n = buildBedtimeNotification(SETTINGS, []);
    expect(n?.schedule?.on?.hour).toBe(23);
    expect(n?.schedule?.on?.minute).toBe(30);
  });
});
