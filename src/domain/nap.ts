/**
 * Power-nap guidance — まどろみ's namesake. A short doze can sharpen thinking
 * in the early-afternoon dip, but a nap too late or too long works against the
 * night's sleep. These are quiet 目安, not prescriptions.
 */

export type NapWindow = 'ideal' | 'caution' | 'discouraged';

export interface NapAdvice {
  /** Suggested nap length (minutes); 0 when napping is discouraged now. */
  recommendedMin: number;
  window: NapWindow;
  /** A quiet one-line note. */
  headline: string;
}

/** A power nap stays short to avoid deep-sleep grogginess. */
export const POWER_NAP_MIN = 20;
/** A lighter nap for the late-afternoon caution window. */
export const SHORT_NAP_MIN = 15;
/** Selectable nap lengths, shortest first. */
export const NAP_LENGTHS_MIN = [10, 15, 20, 25] as const;

/**
 * Advise on a nap for the current time of day and standing sleep debt.
 * Pure and deterministic given `now`.
 */
export function napAdvice(o: { now?: Date; debtMin?: number } = {}): NapAdvice {
  const now = o.now ?? new Date();
  const debtMin = Math.max(0, o.debtMin ?? 0);
  const hour = now.getHours();

  // Early-afternoon dip — the natural window for a short reset.
  if (hour >= 12 && hour < 15) {
    return {
      recommendedMin: POWER_NAP_MIN,
      window: 'ideal',
      headline:
        debtMin > 60
          ? '午後の仮眠で軽く回復できる時間帯です'
          : '短い仮眠で頭がすっきりしやすい時間帯です',
    };
  }

  // Late afternoon — still possible, but keep it short.
  if (hour >= 15 && hour < 17) {
    return {
      recommendedMin: SHORT_NAP_MIN,
      window: 'caution',
      headline: '夜の睡眠に響かないよう、短めに',
    };
  }

  // Evening, night, or morning — protect the proper sleep window instead.
  return {
    recommendedMin: 0,
    window: 'discouraged',
    headline:
      hour >= 17 || hour < 4
        ? '今は夜の睡眠を優先するのがおすすめです'
        : '仮眠よりも、朝の光を浴びるのがおすすめです',
  };
}
