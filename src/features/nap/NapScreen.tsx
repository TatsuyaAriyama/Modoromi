import { useEffect, useMemo, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { Button } from '../../components/Button';
import { sleepDebtMin } from '../../domain/debt';
import { recommendedBedtime } from '../../domain/bedtime';
import { hygieneCues } from '../../domain/hygiene';
import { toHm } from '../../domain/nightShift';
import {
  COFFEE_NAP_MIN,
  NAP_LENGTHS_MIN,
  coffeeNapLate,
  napAdvice,
} from '../../domain/nap';
import { notifySuccess, tapMedium } from '../../lib/haptics';
import { disableKeepAwake, enableKeepAwake } from '../../lib/keepAwake';
import { useT } from '../../i18n/useT';

type Phase = 'setup' | 'running' | 'done';
type Mode = 'normal' | 'coffee';

/** "M:SS" from a millisecond remainder. */
function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const R = 84;
const CIRC = 2 * Math.PI * R;

export function NapScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const targetMin = settings.targetDurationMin;

  const debtMin = useMemo(
    () => sleepDebtMin(sessions, targetMin),
    [sessions, targetMin],
  );
  const advice = useMemo(() => napAdvice({ debtMin }), [debtMin]);

  // The caffeine cutoff is the same "last caffeine" 目安 Home shows; past it, a
  // coffee nap's caffeine risks bleeding into tonight's sleep.
  const caffeineCutoff = useMemo(() => {
    const plan = recommendedBedtime({
      wakeTime: settings.defaultWakeTime,
      targetMin,
      debtMin,
    });
    return hygieneCues(plan.bedtimeHm).caffeineCutoffHm;
  }, [settings.defaultWakeTime, targetMin, debtMin]);
  const coffeeLate = coffeeNapLate(toHm(new Date()), caffeineCutoff);

  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('normal');
  const [chosenMin, setChosenMin] = useState(
    advice.recommendedMin > 0 ? advice.recommendedMin : 15,
  );
  const [remainingMs, setRemainingMs] = useState(chosenMin * 60000);
  const endsAt = useRef<number | null>(null);

  const totalMs = chosenMin * 60000;
  const fraction = phase === 'running' ? remainingMs / totalMs : 1;

  const pickMode = (next: Mode) => {
    setMode(next);
    setChosenMin(
      next === 'coffee'
        ? COFFEE_NAP_MIN
        : advice.recommendedMin > 0
          ? advice.recommendedMin
          : 15,
    );
  };

  // Keep the screen on for the duration of the nap.
  useEffect(() => {
    if (phase === 'running') void enableKeepAwake();
    return () => {
      void disableKeepAwake();
    };
  }, [phase]);

  // Drive the countdown off the wall clock so a backgrounded tab stays honest.
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      const left = Math.max(0, (endsAt.current ?? 0) - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        setPhase('done');
        void notifySuccess();
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  const begin = () => {
    void tapMedium();
    endsAt.current = Date.now() + chosenMin * 60000;
    setRemainingMs(chosenMin * 60000);
    setPhase('running');
  };

  return (
    <div className="app-frame" style={{ background: 'var(--bg)' }}>
      <div className="nap-wrap">
        <div className="nap-head">
          <EyeMark size={44} color="var(--text)" open={phase === 'done'} />
          <h1 className="nap-title">
            {phase === 'done'
              ? t('nap.doneTitle')
              : mode === 'coffee'
                ? t('nap.coffeeTitle')
                : t('nap.title')}
          </h1>
          <p className="nap-note">
            {phase === 'done'
              ? mode === 'coffee'
                ? t('nap.coffeeDone')
                : t('nap.doneNote')
              : mode === 'coffee'
                ? t('nap.coffeeTagline')
                : t(`nap.${advice.headline}`)}
          </p>
        </div>

        {phase === 'setup' && (
          <>
            <div className="seg" role="group" aria-label={t('nap.title')}>
              <button
                data-on={mode === 'normal'}
                aria-pressed={mode === 'normal'}
                onClick={() => pickMode('normal')}
              >
                {t('nap.modeNormal')}
              </button>
              <button
                data-on={mode === 'coffee'}
                aria-pressed={mode === 'coffee'}
                onClick={() => pickMode('coffee')}
              >
                {t('nap.modeCoffee')}
              </button>
            </div>

            {mode === 'normal' ? (
              <div className="nap-chips">
                {NAP_LENGTHS_MIN.map((m) => (
                  <button
                    key={m}
                    className="nap-chip"
                    data-on={chosenMin === m}
                    onClick={() => setChosenMin(m)}
                  >
                    {t('unit.min', { n: m })}
                  </button>
                ))}
              </div>
            ) : (
              <div className="coffee-explain">
                <p className="coffee-what">{t('nap.coffeeWhat')}</p>
                <div className="coffee-cue">{t('nap.coffeeDrink')}</div>
                <div className="coffee-len num">
                  {t('unit.min', { n: COFFEE_NAP_MIN })}
                </div>
                {coffeeLate && (
                  <p className="coffee-warn">{t('nap.coffeeLate')}</p>
                )}
              </div>
            )}

            <div className="nap-foot">
              <Button variant="primary" block large onClick={begin}>
                {mode === 'coffee' ? t('nap.coffeeStart') : t('common.start')}
              </Button>
              <button className="back-btn" onClick={onClose}>
                {t('common.back')}
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <>
            <div className="nap-ring-wrap">
              <svg viewBox="0 0 200 200" className="nap-ring">
                <circle cx="100" cy="100" r={R} className="nap-ring-track" />
                <circle
                  cx="100"
                  cy="100"
                  r={R}
                  className="nap-ring-fill"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - fraction)}
                />
              </svg>
              <div className="nap-time num">{mmss(remainingMs)}</div>
            </div>
            <div className="nap-foot">
              <Button
                variant="ghost"
                block
                large
                onClick={() => {
                  void notifySuccess();
                  setPhase('done');
                }}
              >
                {t('nap.wake')}
              </Button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="nap-foot">
            <Button variant="primary" block large onClick={onClose}>
              {t('common.back')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
