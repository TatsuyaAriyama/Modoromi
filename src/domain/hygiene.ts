import { subtractMinutesHm } from './format';

/**
 * Gentle sleep-hygiene cues derived from tonight's bedtime — a quiet 目安, never
 * a rule. Caffeine lingers for hours, and bright, cool screens hold the mind
 * awake; nudging both ahead of bedtime helps the body arrive at sleep ready.
 */
export interface HygieneCues {
  /** Stop caffeine by this "HH:mm" — caffeine has a long half-life. */
  caffeineCutoffHm: string;
  /** Warm/dim screens after this "HH:mm" — ease off bright blue light. */
  screenWarmHm: string;
}

/** Caffeine clears slowly; a common guideline is to stop ~8h before bed. */
export const CAFFEINE_LEAD_MIN = 8 * 60;
/** Ease off bright, cool light ~90 min before bed. */
export const SCREEN_WARM_LEAD_MIN = 90;

/**
 * Derive the caffeine cutoff and screen-warming times from a bedtime ("HH:mm").
 * Pure and language-agnostic — times wrap within 24h.
 */
export function hygieneCues(bedtimeHm: string): HygieneCues {
  return {
    caffeineCutoffHm: subtractMinutesHm(bedtimeHm, CAFFEINE_LEAD_MIN),
    screenWarmHm: subtractMinutesHm(bedtimeHm, SCREEN_WARM_LEAD_MIN),
  };
}
