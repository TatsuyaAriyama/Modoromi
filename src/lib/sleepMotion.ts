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
