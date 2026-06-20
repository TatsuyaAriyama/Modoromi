import { formatDurationJa, subtractMinutesHm } from './format';

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

/** Title + body + time for the scheduled bedtime reminder notification. */
export interface BedtimeReminderContent {
  /** When to fire the reminder, "HH:mm" — the recovery-aware bedtime. */
  bedtimeHm: string;
  title: string;
  body: string;
  /** Minutes earlier than plain target; 0 when no debt to recover. */
  recoveryMin: number;
}

/**
 * Build the bedtime-reminder notification so its time and copy match the
 * debt-aware bedtime shown on Home. When there is debt to recover, the
 * reminder fires earlier and says by how much; otherwise it's the plain
 * target-based reminder. Pure — the scheduler just consumes the result.
 */
export function bedtimeReminderContent(o: {
  wakeTime: string;
  targetMin: number;
  debtMin: number;
}): BedtimeReminderContent {
  const plan = recommendedBedtime(o);
  const recovering = plan.recoveryMin > 0;
  return {
    bedtimeHm: plan.bedtimeHm,
    recoveryMin: plan.recoveryMin,
    title: recovering
      ? 'そろそろおやすみの時間です（回復のため少し早め）'
      : 'そろそろおやすみの時間です',
    body: recovering
      ? `睡眠負債のぶん、いつもより${formatDurationJa(plan.recoveryMin)}早めが目安です`
      : '目標の睡眠時間を確保するための目安です',
  };
}
