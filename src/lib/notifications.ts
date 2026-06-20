import {
  LocalNotifications,
  type ScheduleOptions,
} from '@capacitor/local-notifications';
import type { AlarmConfig, SleepSession, UserSettings } from '../domain/types';
import { parseHm } from '../domain/format';
import { bedtimeReminderContent } from '../domain/bedtime';
import { sleepDebtMin } from '../domain/debt';
import { isNative } from './platform';

/**
 * Notification scheduling.
 *
 * iOS background-alarm reality (do not over-promise in UI copy):
 * - A scheduled local notification fires even when the app is backgrounded,
 *   the screen is locked, or the app is force-quit — the *system* delivers it.
 * - A single notification plays its sound once (≤30s). To approximate a
 *   ringing alarm we schedule a short BURST of back-to-back notifications.
 * - iOS caps an app at 64 pending notifications, so the builder budgets them.
 * - Breaking through the hardware silent switch / Focus needs the Critical
 *   Alerts entitlement, which Apple rarely grants consumer alarm apps. Without
 *   it, sound is subject to the ringer switch and volume. The loud, reliable
 *   alarm is the in-app one shown while the session screen is foregrounded.
 */

/**
 * Bundled alarm sound. Must be added to the native targets to take effect:
 * iOS: a ≤30s CAF/AIFF/WAV named `madoromi_alarm.caf` in the app target.
 * Android: `android/app/src/main/res/raw/madoromi_alarm.<ext>`.
 * Absent from the bundle, the OS falls back to the default notification tone.
 */
export const ALARM_SOUND = 'madoromi_alarm.caf';

/** Consecutive one-minute chimes per alarm, to mimic a sustained ring. */
export const ALARM_RING_MINUTES = 3;

/** Stay safely under iOS' 64-pending-notification ceiling. */
export const MAX_PENDING = 60;

const BEDTIME_ID = 9_000_000; // reserved, well above the alarm id range
const SNOOZE_ID = 9_000_001;

export async function ensurePermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

/** Deterministic small integer id from an alarm uuid + per-fire slot. */
function notifId(alarmId: string, slot: number): number {
  let h = 0;
  for (let i = 0; i < alarmId.length; i++) {
    h = (h * 31 + alarmId.charCodeAt(i)) | 0;
  }
  // 100 slots per alarm leaves room for 8 weekday-slots × ring-minutes.
  return (Math.abs(h) % 4000) * 100 + slot;
}

type Built = ScheduleOptions['notifications'][number];

/**
 * Resolve one fire time `offsetMin` minutes after an alarm's wall time,
 * carrying past midnight (and advancing the weekday when it does).
 * `weekdayDomain` is 0=Sun..6=Sat, or null for a one-shot alarm.
 */
function occurrence(
  time: string,
  weekdayDomain: number | null,
  offsetMin: number,
): { weekday?: number; hour: number; minute: number } {
  const { hour, minute } = parseHm(time);
  const total = hour * 60 + minute + offsetMin;
  const dayCarry = Math.floor(total / 1440);
  const mins = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (weekdayDomain === null) return { hour: h, minute: m };
  // Capacitor weekday is 1=Sun..7=Sat.
  const wd = (((weekdayDomain + dayCarry) % 7) + 7) % 7;
  return { weekday: wd + 1, hour: h, minute: m };
}

/**
 * Pure: build the notification burst for the enabled alarms, attaching the
 * bundled alarm sound and chaining {@link ALARM_RING_MINUTES} chimes so it
 * rings rather than pinging once. Stops at {@link MAX_PENDING} to respect the
 * OS ceiling. No I/O — `syncSchedules` consumes the result.
 */
export function buildAlarmNotifications(alarms: AlarmConfig[]): Built[] {
  const out: Built[] = [];
  for (const a of alarms) {
    if (!a.enabled) continue;
    // empty repeatDays = one-shot (next occurrence)
    const days: (number | null)[] = a.repeatDays.length ? a.repeatDays : [null];
    for (const wd of days) {
      const slotBase = (wd === null ? 0 : wd + 1) * ALARM_RING_MINUTES;
      for (let m = 0; m < ALARM_RING_MINUTES; m++) {
        if (out.length >= MAX_PENDING) return out;
        const on = occurrence(a.time, wd, m);
        out.push({
          id: notifId(a.id, slotBase + m),
          title: '起床時刻です',
          body: 'Madoromi — おはようございます',
          sound: ALARM_SOUND,
          schedule: { on, allowWhileIdle: true },
        });
      }
    }
  }
  return out;
}

/** Pure: the single bedtime reminder, or null when disabled. */
export function buildBedtimeNotification(
  settings: UserSettings,
  sessions: SleepSession[],
): Built | null {
  if (!settings.bedtimeReminder) return null;
  const reminder = bedtimeReminderContent({
    wakeTime: settings.defaultWakeTime,
    targetMin: settings.targetDurationMin,
    debtMin: sleepDebtMin(sessions, settings.targetDurationMin),
  });
  const { hour, minute } = parseHm(reminder.bedtimeHm);
  return {
    id: BEDTIME_ID,
    title: reminder.title,
    body: reminder.body,
    schedule: { on: { hour, minute }, allowWhileIdle: true },
  };
}

/** Rebuild all scheduled notifications from the current alarms + settings. */
export async function syncSchedules(
  alarms: AlarmConfig[],
  settings: UserSettings,
  sessions: SleepSession[] = [],
): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const toSchedule = buildAlarmNotifications(alarms);
    const bedtime = buildBedtimeNotification(settings, sessions);
    if (bedtime && toSchedule.length < MAX_PENDING) toSchedule.push(bedtime);

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch {
    /* ignore — best-effort */
  }
}

/** Schedule a one-off snooze notification `minutes` from now. */
export async function scheduleSnooze(minutes: number): Promise<void> {
  if (!isNative()) return;
  try {
    const at = new Date(Date.now() + minutes * 60000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: SNOOZE_ID,
          title: '起床時刻です（スヌーズ）',
          body: 'Madoromi',
          sound: ALARM_SOUND,
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}
