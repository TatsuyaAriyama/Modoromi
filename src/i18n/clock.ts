import { translate, type Lang } from './catalog';
import { isoToHm, parseHm } from '../domain/format';
import type { ClockPref } from '../domain/types';

/**
 * Clock display. STORAGE IS ALWAYS 24-HOUR "HH:mm" — alarms, the CSV export
 * and the JSON backup are data and never change shape. Only rendering does.
 *
 * `cycle` matters: Japanese 12-hour is h11 (午前0:30, hours 0–11), English is
 * h12 (12:30 AM, hours 1–12). Getting this wrong renders 午前12:30, which is
 * not a time anyone writes.
 */
export interface Clock {
  h12: boolean;
  cycle: 'h11' | 'h12';
  lang: Lang;
}

let cachedDevice: boolean | null = null;

/**
 * The WebView's region default. Note WKWebView does not reliably propagate
 * iOS Settings → General → 24-Hour Time, so 'auto' follows the REGION, which
 * is exactly why Settings also offers an explicit 12/24 override.
 */
function deviceHour12(): boolean {
  if (cachedDevice === null) {
    try {
      const ro = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
      }).resolvedOptions();
      cachedDevice = ro.hourCycle === 'h11' || ro.hourCycle === 'h12' || ro.hour12 === true;
    } catch {
      cachedDevice = false;
    }
  }
  return cachedDevice;
}

/**
 * `device` is resolved lazily rather than in a default parameter: a default
 * would call Intl on every invocation, including the explicit 12/24 branches,
 * so a test pinning the preference could still be perturbed by the host.
 */
export function resolveClock(
  pref: ClockPref,
  lang: Lang,
  device?: boolean,
): Clock {
  return {
    lang,
    cycle: lang === 'ja' ? 'h11' : 'h12',
    h12: pref === 'auto' ? (device ?? deviceHour12()) : pref === '12',
  };
}

/** 24-hour hour → the displayed hour for this cycle, plus its period. */
export function to12(hour24: number, cycle: 'h11' | 'h12') {
  return {
    h: cycle === 'h11' ? hour24 % 12 : ((hour24 + 11) % 12) + 1,
    pm: hour24 >= 12,
  };
}

/** The inverse: a displayed hour + period back to a 24-hour hour. */
export function from12(h: number, pm: boolean, cycle: 'h11' | 'h12'): number {
  void cycle; // both cycles collapse to the same 24-hour hour
  return (h % 12) + (pm ? 12 : 0);
}

/**
 * Digits and period kept separate: several layouts render them at different
 * sizes, and the 80px session clock cannot afford " PM" at full size.
 * `periodFirst` is true for Japanese (午後11:30).
 */
export function hmParts(hm: string, clock: Clock) {
  const { hour, minute } = parseHm(hm);
  const mm = String(minute).padStart(2, '0');
  if (!clock.h12) {
    return {
      digits: `${String(hour).padStart(2, '0')}:${mm}`,
      period: '',
      periodFirst: false,
    };
  }
  const { h, pm } = to12(hour, clock.cycle);
  return {
    digits: `${h}:${mm}`,
    period: translate(clock.lang, pm ? 'clock.pm' : 'clock.am'),
    periodFirst: clock.lang === 'ja',
  };
}

export function formatHm(hm: string, clock: Clock): string {
  const p = hmParts(hm, clock);
  if (!p.period) return p.digits;
  return p.periodFirst ? `${p.period}${p.digits}` : `${p.digits} ${p.period}`;
}

/** Composed rather than re-implemented, so the two can never drift. */
export const formatIsoTime = (iso: string, clock: Clock): string =>
  formatHm(isoToHm(iso), clock);
