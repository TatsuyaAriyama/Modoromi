import type { SleepSession } from './types';
import { lastSession, sleepDebtMin, debtStatus, type DebtStatus } from './debt';
import { consistencyScore } from './consistency';
import { isQualityConfirmed } from './score';
import { thinkingCondition, type ThinkingTier } from './condition';

/**
 * The compact, serializable read a home-screen widget / Live Activity needs.
 *
 * It mirrors exactly what HomeScreen shows at a glance — the thinking-condition
 * index and trailing sleep debt — but as plain, language-agnostic data so the
 * native widget can localize and render it without touching app internals. The
 * `tier` and `debtStatus` are stable keys (not localized copy) for the widget
 * to map to its own strings/colours; numeric fields are a 目安, never a verdict.
 */
export interface WidgetSnapshot {
  /** Thinking-condition index, 0–100. Higher = likely sharper today. */
  conditionIndex: number;
  /** Condition tier key for native labelling/colouring. */
  tier: ThinkingTier;
  /** Trailing 7-day sleep debt in minutes (positive = under-slept). */
  debtMin: number;
  /** Coarse debt band key, for native colouring. */
  debtStatus: DebtStatus;
  /** Last night's confirmed quality score (0–100), or null if unconfirmed. */
  lastQuality: number | null;
  /** False for a brand-new user with no sessions — widget shows a calm prompt. */
  hasData: boolean;
  /** When this snapshot was computed (ISO instant), for staleness display. */
  updatedAt: string;
}

/**
 * Pure: fold the local sleep log into the widget's at-a-glance snapshot, using
 * the same inputs as the Home screen so the two never disagree. Deterministic
 * given `now`, which is injected for testability.
 */
export function widgetSnapshot(
  sessions: SleepSession[],
  targetMin: number,
  now: Date = new Date(),
): WidgetSnapshot {
  const last = lastSession(sessions);
  const debtMin = sleepDebtMin(sessions, targetMin, 7, now);
  const consistency = consistencyScore(sessions, 7, now);
  const lastQuality =
    last && isQualityConfirmed(last) ? (last.qualityScore ?? null) : null;
  const condition = thinkingCondition({ lastQuality, debtMin, consistency });
  return {
    conditionIndex: condition.index,
    tier: condition.tier,
    debtMin,
    debtStatus: debtStatus(debtMin),
    lastQuality,
    hasData: sessions.length > 0,
    updatedAt: now.toISOString(),
  };
}
