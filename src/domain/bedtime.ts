import { subtractMinutesHm } from './format';

export interface BedtimePlan {
  /** Tonight's suggested bedtime as "HH:mm" (local). */
  bedtimeHm: string;
  /** Minutes earlier than the plain-target bedtime, for gentle recovery. */
  recoveryMin: number;
  /** Suggested sleep window tonight (target + recovery), in minutes. */
  targetTonightMin: number;
  /** The non-negative debt the plan responds to, in minutes. */
  debtMin: number;
}

/** Never suggest going to bed more than this much earlier than target. */
export const MAX_RECOVERY_MIN = 45;
/** Spread any debt over roughly this many nights, so each night is gentle. */
export const RECOVERY_NIGHTS = 4;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Suggest tonight's bedtime from the target wake time and current sleep debt.
 *
 * Recovery is deliberately gentle: only a quarter of the outstanding debt is
 * paid back tonight, rounded to 5 minutes and capped at {@link MAX_RECOVERY_MIN}
 * so the suggestion never asks for a jarring early night. Pure and
 * deterministic — a 目安, not a prescription.
 */
export function recommendedBedtime(o: {
  wakeTime: string;
  targetMin: number;
  debtMin: number;
}): BedtimePlan {
  const debtMin = Math.max(0, o.debtMin);
  const recoveryMin = clamp(
    Math.round(debtMin / RECOVERY_NIGHTS / 5) * 5,
    0,
    MAX_RECOVERY_MIN,
  );
  const targetTonightMin = o.targetMin + recoveryMin;
  const bedtimeHm = subtractMinutesHm(o.wakeTime, targetTonightMin);
  return { bedtimeHm, recoveryMin, targetTonightMin, debtMin };
}

/** Time + recovery signals for the scheduled bedtime reminder notification. */
export interface BedtimeReminderContent {
  /** When to fire the reminder, "HH:mm" — the recovery-aware bedtime. */
  bedtimeHm: string;
  /** Minutes earlier than plain target; 0 when no debt to recover. */
  recoveryMin: number;
  /** True when firing earlier than target to recover debt. */
  recovering: boolean;
}

/**
 * Compute the bedtime-reminder timing so it matches the debt-aware bedtime
 * shown on Home. When there is debt to recover, the reminder fires earlier.
 * Pure and language-agnostic — the scheduler localizes the copy.
 */
export function bedtimeReminderContent(o: {
  wakeTime: string;
  targetMin: number;
  debtMin: number;
}): BedtimeReminderContent {
  const plan = recommendedBedtime(o);
  return {
    bedtimeHm: plan.bedtimeHm,
    recoveryMin: plan.recoveryMin,
    recovering: plan.recoveryMin > 0,
  };
}
