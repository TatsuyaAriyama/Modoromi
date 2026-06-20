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
 * Notification scheduling. iOS caveat (surfaced in onboarding copy): a
 * LocalNotification cannot be guaranteed to ring loudly while the device is
 * locked / on silent / in a Focus mode — that needs critical-alert
 * entitlement or native work (Phase 2). MVP = best-effort notification.
 */

const BEDTIME_ID = 9000; // reserved id range for the single bedtime reminder

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

/** Deterministic small integer id from an alarm uuid + weekday slot. */
function notifId(alarmId: string, slot: number): number {
  let h = 0;
  for (let i = 0; i < alarmId.length; i++) {
    h = (h * 31 + alarmId.charCodeAt(i)) | 0;
  }
  // keep positive and below the reserved bedtime range
  return (Math.abs(h) % 8000) * 10 + slot;
}

/** Rebuild all scheduled notifications from the current alarm + settings. */
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

    const toSchedule: ScheduleOptions['notifications'] = [];

    for (const a of alarms) {
      if (!a.enabled) continue;
      const { hour, minute } = parseHm(a.time);
      if (a.repeatDays.length === 0) {
        // one-shot: next occurrence of this time
        toSchedule.push({
          id: notifId(a.id, 0),
          title: '起床時刻です',
          body: 'Madoromi — おはようございます',
          schedule: { on: { hour, minute }, allowWhileIdle: true },
        });
      } else {
        for (const wd of a.repeatDays) {
          toSchedule.push({
            id: notifId(a.id, wd + 1),
            title: '起床時刻です',
            body: 'Madoromi — おはようございます',
            // Capacitor weekday is 1=Sun..7=Sat
            schedule: {
              on: { weekday: wd + 1, hour, minute },
              allowWhileIdle: true,
            },
          });
        }
      }
    }

    // Bedtime reminder: recovery-aware, matching Home's suggested bedtime —
    // earlier (and saying so) when there is sleep debt to pay back gently.
    if (settings.bedtimeReminder) {
      const reminder = bedtimeReminderContent({
        wakeTime: settings.defaultWakeTime,
        targetMin: settings.targetDurationMin,
        debtMin: sleepDebtMin(sessions, settings.targetDurationMin),
      });
      const { hour, minute } = parseHm(reminder.bedtimeHm);
      toSchedule.push({
        id: BEDTIME_ID,
        title: reminder.title,
        body: reminder.body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      });
    }

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
          id: BEDTIME_ID + 1,
          title: '起床時刻です（スヌーズ）',
          body: 'Madoromi',
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}
