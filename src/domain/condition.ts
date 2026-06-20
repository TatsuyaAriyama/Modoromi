import { clamp } from './score';

export type ThinkingTier = 'sharp' | 'steady' | 'foggy' | 'depleted';

export interface ConditionInput {
  /** Last night's confirmed quality score (0–100), or null if unconfirmed. */
  lastQuality: number | null;
  /** Trailing sleep debt in minutes (positive = under-slept). */
  debtMin: number;
  /** Sleep regularity 0–1, or null when not yet known. */
  consistency: number | null;
}

export interface ThinkingCondition {
  index: number; // 0–100
  tier: ThinkingTier;
}

/** Neutral baseline used when last night has no confirmed quality score. */
const NEUTRAL_BASE = 60;
/** Points lost per hour of sleep debt (capped). */
const DEBT_PENALTY_PER_HOUR = 4;
const MAX_DEBT_PENALTY = 30;
/** Regularity swings the index by up to ±this many points around 0.5. */
const CONSISTENCY_SWING = 10;

/**
 * Translate sleep signals into a single "thinking condition" index. This is a
 * quiet, motivational read — explicitly a 目安, not a medical or cognitive
 * measurement. Higher means more likely to feel mentally sharp today.
 *
 * index = base(quality) − debtPenalty + consistencyAdjustment, clamped 0–100.
 */
export function thinkingCondition(input: ConditionInput): ThinkingCondition {
  const { lastQuality, debtMin, consistency } = input;

  const base = lastQuality ?? NEUTRAL_BASE;

  const debtPenalty = clamp(
    (Math.max(0, debtMin) / 60) * DEBT_PENALTY_PER_HOUR,
    0,
    MAX_DEBT_PENALTY,
  );

  const consistencyAdj =
    consistency == null ? 0 : (consistency - 0.5) * 2 * CONSISTENCY_SWING;

  const index = Math.round(clamp(base - debtPenalty + consistencyAdj, 0, 100));
  return { index, tier: conditionTier(index) };
}

export function conditionTier(index: number): ThinkingTier {
  if (index >= 75) return 'sharp';
  if (index >= 55) return 'steady';
  if (index >= 35) return 'foggy';
  return 'depleted';
}
