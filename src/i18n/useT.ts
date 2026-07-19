import { useMemo } from 'react';
import { useStore } from '../app/store';
import { translate, type Lang, type Params } from './catalog';
import { resolveClock, type Clock } from './clock';

/** Current UI language from settings. */
export function useLang(): Lang {
  return useStore((s) => s.settings.lang);
}

/**
 * Returns a memoized translator bound to the active language. Usage:
 *   const t = useT();
 *   t('common.save');
 *   t('insight.weekendDrift', { diff: 45 });
 */
export function useT(): (key: string, params?: Params) => string {
  const lang = useStore((s) => s.settings.lang);
  return useMemo(() => (key: string, params?: Params) => translate(lang, key, params), [lang]);
}

/**
 * The resolved clock for display. Two primitive selectors memoized into one
 * object — never return a fresh object straight from a Zustand selector.
 */
export function useClock(): Clock {
  const lang = useStore((s) => s.settings.lang);
  const pref = useStore((s) => s.settings.clockPref);
  return useMemo(() => resolveClock(pref, lang), [pref, lang]);
}
