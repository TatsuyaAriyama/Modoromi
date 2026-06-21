import { registerPlugin } from '@capacitor/core';
import type { Movement } from '../domain/types';
import { isNative } from './platform';

/**
 * Background sleep-motion recording.
 *
 * The web DeviceMotion stream (`@capacitor/motion`) only runs while the screen
 * is on, so it can't track a real night. This plugin wraps the platform APIs
 * that *do* keep sampling with the screen off:
 *  - iOS: `CMSensorRecorder` records accelerometer to the motion coprocessor's
 *    buffer even while the app is suspended; we read it back on wake.
 *  - Android: a foreground service holds a sensor listener for the session.
 *
 * Both run the samples through the same detection algorithm as the JS core and
 * return a compact list of {@link Movement}s. Until the native targets are
 * wired in Xcode / Android Studio, `registerPlugin` resolves to a stub whose
 * calls reject; the wrappers below absorb that and the app falls back to the
 * foreground JS recorder.
 */
export interface SleepMotionPlugin {
  /** Whether background accelerometer recording is available on this device. */
  isAvailable(): Promise<{ available: boolean }>;
  /** Begin background recording for the session. */
  start(): Promise<void>;
  /** Stop and return movements detected across the whole session. */
  stop(): Promise<{ movements: Movement[] }>;
  /**
   * Recover an interrupted session after the app was killed mid-night. iOS
   * reads the coprocessor buffer back from `startISO`; Android reads whatever
   * the service persisted before it died. `recovered` is false when nothing
   * could be read back.
   */
  recover(options: {
    startISO: string;
  }): Promise<{ movements: Movement[]; recovered: boolean }>;
  /**
   * Android: whether the app is exempt from battery optimization (so the OS /
   * OEM won't kill the recording service mid-night). Always true off Android.
   */
  isUnrestricted(): Promise<{ unrestricted: boolean }>;
  /** Android: open the system prompt to grant the battery-optimization exemption. */
  requestUnrestricted(): Promise<void>;
}

export const SleepMotion = registerPlugin<SleepMotionPlugin>('SleepMotion');

/** True only where the native background recorder is present and ready. */
export async function sleepMotionAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    return (await SleepMotion.isAvailable()).available;
  } catch {
    return false;
  }
}

/**
 * Recover the motion for an interrupted session that started at `startISO`.
 * Returns the read-back movements and whether anything was actually recovered.
 * Off-device or on error, reports nothing recovered.
 */
export async function recoverMotionSince(
  startISO: string,
): Promise<{ movements: Movement[]; recovered: boolean }> {
  if (!isNative()) return { movements: [], recovered: false };
  try {
    const res = await SleepMotion.recover({ startISO });
    return {
      movements: Array.isArray(res.movements) ? res.movements : [],
      recovered: !!res.recovered,
    };
  } catch {
    return { movements: [], recovered: false };
  }
}

/**
 * Is background recording free to run through the night? On Android this
 * reflects the battery-optimization exemption — without it, aggressive OEM
 * power managers kill the foreground service and the night is cut short (the
 * exact gap the verification harness flags). Resolves true off Android.
 */
export async function sleepMotionUnrestricted(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    return (await SleepMotion.isUnrestricted()).unrestricted;
  } catch {
    return true;
  }
}

/** Open the OS prompt to exempt the app from battery optimization (Android). */
export async function requestSleepMotionUnrestricted(): Promise<void> {
  if (!isNative()) return;
  try {
    await SleepMotion.requestUnrestricted();
  } catch {
    /* best-effort */
  }
}
