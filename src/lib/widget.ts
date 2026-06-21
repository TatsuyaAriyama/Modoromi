import { registerPlugin } from '@capacitor/core';
import type { WidgetSnapshot } from '../domain/widgetSnapshot';
import { isNative } from './platform';

/**
 * Home-screen widget / Live Activity bridge.
 *
 * Madoromi keeps its log local; this pushes a tiny, already-computed
 * {@link WidgetSnapshot} out to the native side so a WidgetKit timeline (and,
 * later, a Live Activity) can render today's thinking condition and sleep debt
 * without reaching into the app. It is strictly one-way and best-effort:
 * off-device (web/Android) it is a no-op, and any failure is swallowed so the
 * app's own flows never block on the widget refreshing.
 *
 * The native half is a small custom Capacitor plugin (`Widget`, Swift) that
 * writes the snapshot to the shared App Group container and calls
 * `WidgetCenter.shared.reloadAllTimelines()`. Until that target is wired in
 * Xcode, `registerPlugin` resolves to a stub whose calls reject; the wrapper
 * below absorbs that, so the JS app behaves identically.
 */

export interface WidgetPlugin {
  /** Hand the latest snapshot to the native side and reload widget timelines. */
  reload(data: { snapshot: WidgetSnapshot }): Promise<void>;
}

const Widget = registerPlugin<WidgetPlugin>('Widget');

/**
 * Publish a snapshot to the home-screen widget. No-op off-device; best-effort
 * on-device (a denied/failed reload is swallowed).
 */
export async function pushWidgetSnapshot(
  snapshot: WidgetSnapshot,
): Promise<void> {
  if (!isNative()) return;
  try {
    await Widget.reload({ snapshot });
  } catch {
    /* ignore — best-effort */
  }
}
