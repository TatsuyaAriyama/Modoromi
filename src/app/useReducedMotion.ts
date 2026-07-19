import { useSyncExternalStore } from 'react';

/**
 * The OS "reduce motion" preference, for the animations CSS cannot reach —
 * i.e. the requestAnimationFrame drivers (wind-down breathing, the alarm
 * orbit tween). CSS handles everything else via the media query in index.css.
 *
 * Lives in app/ rather than lib/ because lib/motion.ts is the accelerometer.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

/** jsdom (vitest) does not implement matchMedia — guard, never assume. */
function mql(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

/** Imperative read, for use outside React (rAF callbacks, event handlers). */
export function prefersReducedMotion(): boolean {
  return mql()?.matches ?? false;
}

function subscribe(onChange: () => void): () => void {
  const m = mql();
  if (!m) return () => {};
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}

/** Reactive read; responds live if the user flips the OS setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
