import type { Movement, SleepSession } from './types';

/**
 * Recovering a sleep session the app never got to end.
 *
 * If the OS kills the app/service mid-night (an OEM battery manager, an OOM, a
 * crash, a force-quit), `endSession` never runs and the night would be lost
 * with a dangling "in progress" marker. On the next launch we reconstruct it:
 *  - iOS can read the whole night back from the CMSensorRecorder buffer, which
 *    keeps recording in the coprocessor regardless of app state.
 *  - Android reads back whatever the foreground service persisted before it was
 *    killed.
 *
 * The end time is unknown (we only know when the user reopened the app), so the
 * recovered session is marked `recovered` and routed through the morning check
 * for the user to confirm. Pure and deterministic given its inputs.
 */

/** Written to storage when a session starts; read on launch to detect a crash. */
export interface RecoveryMarker {
  sessionId: string;
  /** ISO start time of the interrupted session. */
  startedAt: string;
}

/**
 * A gap longer than this between start and relaunch is implausible for one
 * night — the marker is treated as stale and discarded rather than producing a
 * nonsensical multi-day "session".
 */
export const MAX_RECOVERABLE_MIN = 18 * 60;

/**
 * Reconstruct an interrupted session, or null when the marker is invalid or too
 * stale to trust. `movements`/`recovered` come from the native read-back: when
 * the night's motion couldn't be recovered the session is stored untracked
 * rather than as a falsely "still" night.
 */
export function recoverSession(o: {
  marker: RecoveryMarker;
  now: Date;
  movements?: Movement[];
  recovered: boolean;
}): SleepSession | null {
  const start = new Date(o.marker.startedAt).getTime();
  if (Number.isNaN(start)) return null;
  const durationMin = Math.round((o.now.getTime() - start) / 60000);
  if (durationMin <= 0 || durationMin > MAX_RECOVERABLE_MIN) return null;

  return {
    id: o.marker.sessionId,
    startedAt: o.marker.startedAt,
    endedAt: o.now.toISOString(),
    durationMin,
    recovered: true,
    motionSource: o.recovered ? 'native' : 'none',
    ...(o.recovered ? { movements: o.movements ?? [] } : {}),
  };
}
