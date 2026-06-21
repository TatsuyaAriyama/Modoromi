import { useEffect, useState } from 'react';
import { useStore } from './store';
import { sleepDebtMin } from '../domain/debt';
import { recommendedBedtime } from '../domain/bedtime';
import { hygieneCues } from '../domain/hygiene';
import { inCircularWindow, toHm } from '../domain/nightShift';

/**
 * "Wind-down mode": from the screen-warming time (≈90 min before tonight's
 * bedtime) until the wake time, gently warm and dim the interface to ease the
 * eyes and cut blue light before sleep — the automatic counterpart to the
 * "warm your screen" cue on Home. Re-evaluates on a minute interval, like the
 * theme. Off during an active session (the sleep screen is already dark).
 */
export function useNightShift(): boolean {
  const settings = useStore((s) => s.settings);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const debt = sleepDebtMin(sessions, settings.targetDurationMin);
  const plan = recommendedBedtime({
    wakeTime: settings.defaultWakeTime,
    targetMin: settings.targetDurationMin,
    debtMin: debt,
  });
  const { screenWarmHm } = hygieneCues(plan.bedtimeHm);
  const on =
    !active &&
    inCircularWindow(toHm(new Date()), screenWarmHm, settings.defaultWakeTime);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-nightshift',
      on ? 'true' : 'false',
    );
    // tick is a dependency so the attribute refreshes as the clock advances.
  }, [on, tick]);

  return on;
}
