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

export interface UserSettings {
  theme: ThemePref;
  targetDurationMin: number; // e.g. 450 (7.5h)
  defaultWakeTime: string; // "HH:mm"
  bedtimeReminder: boolean;
  onboarded: boolean; // first-launch flow completed
  /**
   * Smart wake: end the session a little early when body movement suggests
   * light sleep within the window before the set alarm. Only fires while the
   * session screen is foregrounded.
   */
  smartAlarm: boolean;
}
