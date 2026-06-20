import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

/** Light, optional tactile feedback on key actions. Silently no-ops on web. */
export async function tapLight(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

export async function tapMedium(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}

export async function notifySuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}
