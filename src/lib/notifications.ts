import {
  LocalNotifications,
  type ScheduleOptions,
} from '@capacitor/local-notifications';
import type { AlarmConfig, Lang, SleepSession, UserSettings } from '../domain/types';
import { parseHm } from '../domain/format';
import { nextAlarmDate } from '../domain/alarmFire';
import { bedtimeReminderContent } from '../domain/bedtime';
import { sleepDebtMin } from '../domain/debt';
import { translate as tr, formatDuration } from '../i18n/catalog';
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

/** A snooze rings as a burst too — one notification's sound is ≤30s. */
export const SNOOZE_IDS = Array.from(
  { length: ALARM_RING_MINUTES },
  (_, m) => SNOOZE_ID + m,
);

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
 * bundled alarm sound and chaining up to {@link ALARM_RING_MINUTES} chimes so
 * each fire rings rather than pinging once.
 *
 * Budgeting under the iOS 64-pending ceiling is *fair*, not first-come. Naively
 * filling alarm-by-alarm lets the earliest alarms eat the whole budget, leaving
 * later enabled alarms with zero notifications — they would silently never ring.
 * Instead we list one occurrence per fire-day, interleaved across alarms, then
 * hand out chimes in round-robin layers: every occurrence gets its first chime
 * before any gets a second. So when demand exceeds `budget` the burst degrades
 * by *shortening* rings, and every alarm still fires, rather than dropping whole
 * alarms off the end. No I/O — `syncSchedules` consumes the result.
 */
export function buildAlarmNotifications(
  alarms: AlarmConfig[],
  lang: Lang = 'en',
  budget: number = MAX_PENDING,
  now: Date = new Date(),
): Built[] {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0 || budget <= 0) return [];

  // empty repeatDays = one-shot (next occurrence)
  const perAlarm = enabled.map((a) => ({
    alarm: a,
    days: (a.repeatDays.length ? a.repeatDays : [null]) as (number | null)[],
  }));

  // One occurrence per fire-day, interleaved across alarms (all alarms' first
  // day, then all alarms' second day, …) so a tight budget reaches every alarm.
  const occ: { alarm: AlarmConfig; wd: number | null }[] = [];
  const maxDays = Math.max(...perAlarm.map((p) => p.days.length));
  for (let d = 0; d < maxDays; d++) {
    for (const p of perAlarm) {
      if (d < p.days.length) occ.push({ alarm: p.alarm, wd: p.days[d] });
    }
  }

  // Round-robin chime layers across all occurrences, capped at the budget.
  const ring = new Array<number>(occ.length).fill(0);
  let remaining = budget;
  for (let m = 0; m < ALARM_RING_MINUTES && remaining > 0; m++) {
    for (let i = 0; i < occ.length && remaining > 0; i++) {
      ring[i]++;
      remaining--;
    }
  }

  // Ids are structural (position in the enabled list), not a hash of the uuid:
  // a hash modulo 4000 collides, and two colliding alarms silently overwrite
  // each other's notifications.
  const idxOf = new Map(enabled.map((a, i) => [a.id, i]));

  const out: Built[] = [];
  for (let i = 0; i < occ.length; i++) {
    const { alarm: a, wd } = occ[i];
    const slotBase = (wd === null ? 0 : wd + 1) * ALARM_RING_MINUTES;
    for (let m = 0; m < ring[i]; m++) {
      const common = {
        id: (idxOf.get(a.id) ?? 0) * 100 + slotBase + m,
        title: tr(lang, 'notif.wakeTitle'),
        body: tr(lang, 'notif.wakeBody'),
        sound: ALARM_SOUND,
        // Pierces Sleep Focus without needing the Critical Alerts entitlement.
        interruptionLevel: 'timeSensitive' as const,
      };
      if (wd === null) {
        // One-shot. `schedule.on` is a CALENDAR trigger — iOS repeats it every
        // day forever and Android re-arms it — so a "just tomorrow" alarm must
        // use an absolute instant instead.
        const base = a.firesAt
          ? new Date(a.firesAt)
          : nextAlarmDate(a.time, new Date(now.getTime() + 60_000));
        const at = new Date(base.getTime() + m * 60_000);
        // iOS rejects the whole batch if any date is in the past.
        if (at.getTime() <= now.getTime()) continue;
        out.push({ ...common, schedule: { at, allowWhileIdle: true } });
      } else {
        out.push({
          ...common,
          schedule: { on: occurrence(a.time, wd, m), allowWhileIdle: true },
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
  const lang = settings.lang;
  const { hour, minute } = parseHm(reminder.bedtimeHm);
  return {
    id: BEDTIME_ID,
    title: tr(lang, reminder.recovering ? 'bedtime.titleEarly' : 'bedtime.title'),
    body: reminder.recovering
      ? tr(lang, 'bedtime.bodyEarly', {
          amount: formatDuration(reminder.recoveryMin, lang),
        })
      : tr(lang, 'bedtime.body'),
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
    // Never sweep away a live snooze: this runs on any alarm/settings change,
    // and cancelling the snooze would silently drop the re-ring.
    const stale = pending.notifications.filter((n) => !SNOOZE_IDS.includes(n.id));
    if (stale.length) {
      await LocalNotifications.cancel({
        notifications: stale.map((n) => ({ id: n.id })),
      });
    }

    // Reserve one pending slot for the bedtime reminder so a full set of
    // alarms can't starve it out of the budget.
    const bedtime = buildBedtimeNotification(settings, sessions);
    const budget = bedtime ? MAX_PENDING - 1 : MAX_PENDING;
    const toSchedule = buildAlarmNotifications(alarms, settings.lang, budget);
    if (bedtime) toSchedule.push(bedtime);

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch {
    /* ignore — best-effort */
  }
}

/**
 * Schedule the snooze re-ring `minutes` from now, as a burst for the same
 * reason alarms are. This is the OS-level backstop: the in-app snooze timer
 * lives in a foregrounded WebView, which the OS suspends the moment the
 * screen locks — exactly what happens after someone hits snooze.
 */
export async function scheduleSnooze(
  minutes: number,
  lang: Lang = 'en',
): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: SNOOZE_IDS.map((id, m) => ({
        id,
        title: tr(lang, 'notif.snoozeTitle'),
        body: tr(lang, 'notif.snoozeBody'),
        sound: ALARM_SOUND,
        interruptionLevel: 'timeSensitive' as const,
        schedule: {
          at: new Date(Date.now() + minutes * 60000 + m * 60000),
          allowWhileIdle: true,
        },
      })),
    });
  } catch {
    /* ignore */
  }
}

/** Drop a pending snooze — the user is up, or the session ended. */
export async function cancelSnooze(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: SNOOZE_IDS.map((id) => ({ id })),
    });
  } catch {
    /* ignore */
  }
}
