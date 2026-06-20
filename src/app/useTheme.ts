import { useEffect, useState } from 'react';
import type { ThemePref } from '../domain/types';
import { useStore } from './store';

export type ResolvedTheme = 'day' | 'night' | 'sleep';

/** Resolve the day/night base theme from the user's preference + clock. */
export function resolveBaseTheme(pref: ThemePref, now: Date = new Date()): 'day' | 'night' {
  if (pref === 'day') return 'day';
  if (pref === 'night') return 'night';
  // auto: prefer night during 22:00–06:00, otherwise follow the OS setting.
  const h = now.getHours();
  if (h >= 22 || h < 6) return 'night';
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'night';
  }
  return 'day';
}

/**
 * Applies the resolved theme to <html data-theme>. Sleep theme wins whenever a
 * session is active. Re-evaluates on an interval so the auto clock-based
 * switch happens without a reload.
 */
export function useTheme(): ResolvedTheme {
  const pref = useStore((s) => s.settings.theme);
  const active = useStore((s) => s.active);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const resolved: ResolvedTheme = active ? 'sleep' : resolveBaseTheme(pref);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved, tick]);

  return resolved;
}
