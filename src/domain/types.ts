export type Mood = 'fresh' | 'normal' | 'groggy';

export interface SleepSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationMin: number;
  mood?: Mood;
  subjective?: number; // 1–5 (optional)
  note?: string;
  qualityScore?: number; // 0–100, confirmed after morning check
  // Reserved for Phase 2: movements?: { t: number; magnitude: number }[]
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
}
