export type Mood = 'fresh' | 'normal' | 'groggy';

/**
 * A detected body movement during sleep.
 * `t` is minutes elapsed since the session started; `magnitude` is the
 * gravity-excluded acceleration peak (m/s²) that triggered the detection.
 */
export interface Movement {
  t: number;
  magnitude: number;
}

export interface SleepSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationMin: number;
  mood?: Mood;
  subjective?: number; // 1–5 (optional)
  note?: string;
  qualityScore?: number; // 0–100, confirmed after morning check
  /**
   * An optional one-line "thing to think about today", set at the morning
   * check. Surfaced on Home through the day — sleep in service of thinking.
   */
  theme?: string;
  /**
   * Body movements recorded via the accelerometer. Presence of the array
   * (even when empty) means motion was tracked — empty = perfectly still.
   * Absent means motion was unavailable (e.g. browser, permission denied).
   */
  movements?: Movement[];
  /**
   * True when smart wake ended this session a little early (light sleep
   * detected inside the pre-alarm window). Absent for a normal wake.
   */
  smartWoke?: boolean;
  /**
   * True when this night was imported from Apple Health rather than tracked in
   * Madoromi. Imported nights carry only timing (no mood/quality) and are never
   * mirrored back to Health, so import and write-sync can't echo each other.
   */
  imported?: boolean;
}

export interface AlarmConfig {
  id: string;
  time: string; // "HH:mm"
  repeatDays: number[]; // 0=Sun .. 6=Sat, empty = one-shot
  sound: string;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
  enabled: boolean;
}

export type ThemePref = 'auto' | 'day' | 'night';

/** UI language. English is the default; Japanese is selectable. */
export type Lang = 'en' | 'ja';

export interface UserSettings {
  /** UI language (defaults to English). */
  lang: Lang;
  theme: ThemePref;
  targetDurationMin: number; // e.g. 450 (7.5h)
  defaultWakeTime: string; // "HH:mm"
  bedtimeReminder: boolean;
  /**
   * A gentle weekly notification (Sunday evening) summarising the past week,
   * so the review is noticed without having to go looking for it. Opt-in.
   */
  weeklyReview: boolean;
  onboarded: boolean; // first-launch flow completed
  /**
   * Smart wake: end the session a little early when body movement suggests
   * light sleep within the window before the set alarm. Only fires while the
   * session screen is foregrounded.
   */
  smartAlarm: boolean;
  /**
   * How many minutes before the alarm smart wake starts watching for light
   * sleep. Only meaningful when `smartAlarm` is on.
   */
  smartWindowMin: number;
  /**
   * Mirror confirmed sleep sessions to Apple Health (HKCategoryTypeSleepAnalysis,
   * `inBed`). Opt-in: writing requires the user to grant HealthKit permission,
   * and the write is a best-effort native side-effect (no-op off-device).
   */
  healthSync: boolean;
}
