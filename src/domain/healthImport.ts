import type { SleepSession } from './types';

/**
 * Importing sleep from Apple Health.
 *
 * Health returns sleep as many short segments (in-bed and per-stage asleep
 * samples). To fit Madoromi's one-session-per-night model we cluster nearby
 * segments into nights, then keep only nights that don't overlap a session the
 * user already has — so importing is idempotent and never duplicates a night
 * already logged in the app (or imported on a previous run).
 *
 * Pure and deterministic: the native bridge fetches the raw samples, this turns
 * them into importable sessions.
 */

export interface HealthSleepSample {
  startISO: string;
  endISO: string;
  /** HKCategoryValueSleepAnalysis raw value, when known. 2 = awake. */
  value?: number;
}

/** Segments within this gap (minutes) belong to the same sleep period. */
export const NIGHT_GAP_MIN = 60;
/** Ignore clustered nights shorter than this — likely noise, not real sleep. */
export const MIN_NIGHT_MIN = 30;
/** HKCategoryValueSleepAnalysis.awake — excluded so it doesn't pad the window. */
const AWAKE_VALUE = 2;

interface Span {
  start: number;
  end: number;
}

function toSpans(samples: HealthSleepSample[]): Span[] {
  const spans: Span[] = [];
  for (const s of samples) {
    if (s.value === AWAKE_VALUE) continue;
    const start = new Date(s.startISO).getTime();
    const end = new Date(s.endISO).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    spans.push({ start, end });
  }
  return spans.sort((a, b) => a.start - b.start);
}

/** Merge overlapping or near-adjacent sleep samples into candidate nights. */
export function clusterNights(samples: HealthSleepSample[]): Span[] {
  const spans = toSpans(samples);
  const gapMs = NIGHT_GAP_MIN * 60000;
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end + gapMs) {
      last.end = Math.max(last.end, s.end);
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Build importable sessions from Health samples, dropping any night that
 * overlaps an existing local session and any cluster shorter than
 * {@link MIN_NIGHT_MIN}. Stable ids (`health:<startMs>`) plus the overlap check
 * make a re-import a no-op.
 */
export function sessionsFromHealth(
  samples: HealthSleepSample[],
  existing: SleepSession[],
): SleepSession[] {
  const windows = existing.map((s) => ({
    start: new Date(s.startedAt).getTime(),
    end: new Date(s.endedAt).getTime(),
  }));
  const out: SleepSession[] = [];
  for (const night of clusterNights(samples)) {
    const durationMin = Math.round((night.end - night.start) / 60000);
    if (durationMin < MIN_NIGHT_MIN) continue;
    if (windows.some((w) => overlaps(night.start, night.end, w.start, w.end))) {
      continue;
    }
    out.push({
      id: `health:${night.start}`,
      startedAt: new Date(night.start).toISOString(),
      endedAt: new Date(night.end).toISOString(),
      durationMin,
      imported: true,
    });
  }
  return out;
}
