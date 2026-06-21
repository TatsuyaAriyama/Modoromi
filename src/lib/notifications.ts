import {
  LocalNotifications,
  type ScheduleOptions,
} from '@capacitor/local-notifications';
import type { AlarmConfig, Lang, SleepSession, UserSettings } from '../domain/types';
import { parseHm } from '../domain/format';
import { bedtimeReminderContent } from '../domain/bedtime';
import { sleepDebtMin } from '../domain/debt';
import { weeklyReview } from '../domain/review';
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
const WEEKLY_REVIEW_ID = 9_000_002;

/** Sunday (Capacitor weekday 1) at 21:00 — a calm hour to look back on the week. */
export const WEEKLY_REVIEW_WEEKDAY = 1;
export const WEEKLY_REVIEW_HOUR = 21;

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

  const out: Built[] = [];
  for (let i = 0; i < occ.length; i++) {
    const { alarm: a, wd } = occ[i];
    const slotBase = (wd === null ? 0 : wd + 1) * ALARM_RING_MINUTES;
    for (let m = 0; m < ring[i]; m++) {
      const on = occurrence(a.time, wd, m);
      out.push({
        id: notifId(a.id, slotBase + m),
        title: tr(lang, 'notif.wakeTitle'),
        body: tr(lang, 'notif.wakeBody'),
        sound: ALARM_SOUND,
        schedule: { on, allowWhileIdle: true },
      });
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

/**
 * Pure: the weekly review reminder, or null when disabled. It repeats every
 * Sunday evening; the body carries this week's quiet one-line summary, the same
 * headline shown on the History screen. Refreshed whenever schedules are
 * rebuilt, so an active user always sees the latest week.
 */
export function buildWeeklyReviewNotification(
  settings: UserSettings,
  sessions: SleepSession[],
  now: Date = new Date(),
): Built | null {
  if (!settings.weeklyReview) return null;
  const lang = settings.lang;
  const review = weeklyReview(sessions, settings.targetDurationMin, now);
  const body = review.headlineParts
    .map((p) => tr(lang, `review.${p}`))
    .join(tr(lang, 'sep.middot'));
  return {
    id: WEEKLY_REVIEW_ID,
    title: tr(lang, 'weekly.title'),
    body,
    schedule: {
      on: {
        weekday: WEEKLY_REVIEW_WEEKDAY,
        hour: WEEKLY_REVIEW_HOUR,
        minute: 0,
      },
      allowWhileIdle: true,
    },
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

    // Reserve a pending slot for each standalone reminder so a full set of
    // alarms can't starve them out of the budget.
    const bedtime = buildBedtimeNotification(settings, sessions);
    const weekly = buildWeeklyReviewNotification(settings, sessions);
    const reserved = (bedtime ? 1 : 0) + (weekly ? 1 : 0);
    const budget = MAX_PENDING - reserved;
    const toSchedule = buildAlarmNotifications(alarms, settings.lang, budget);
    if (bedtime) toSchedule.push(bedtime);
    if (weekly) toSchedule.push(weekly);

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch {
    /* ignore — best-effort */
  }
}

/** Schedule a one-off snooze notification `minutes` from now. */
export async function scheduleSnooze(
  minutes: number,
  lang: Lang = 'en',
): Promise<void> {
  if (!isNative()) return;
  try {
    const at = new Date(Date.now() + minutes * 60000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: SNOOZE_ID,
          title: tr(lang, 'notif.snoozeTitle'),
          body: tr(lang, 'notif.snoozeBody'),
          sound: ALARM_SOUND,
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}
