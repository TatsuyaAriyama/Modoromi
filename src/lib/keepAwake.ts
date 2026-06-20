import { KeepAwake } from '@capacitor-community/keep-awake';
import { isNative } from './platform';

/** Keep the screen on during a sleep session (optional, user-toggled). */
export async function enableKeepAwake(): Promise<void> {
  if (!isNative()) return;
  try {
    await KeepAwake.keepAwake();
  } catch {
    /* ignore */
  }
}

export async function disableKeepAwake(): Promise<void> {
  if (!isNative()) return;
  try {
    await KeepAwake.allowSleep();
  } catch {
    /* ignore */
  }
}
