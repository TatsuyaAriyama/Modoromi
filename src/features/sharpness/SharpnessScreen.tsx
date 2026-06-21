import { useCallback, useEffect, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Button } from '../../components/Button';
import {
  SHARP_TRIALS,
  buildResult,
  sharpnessTier,
  type SharpnessResult,
} from '../../domain/sharpness';
import { uid } from '../../lib/id';
import { tapLight, tapMedium, notifySuccess } from '../../lib/haptics';
import { useT } from '../../i18n/useT';

type Phase = 'intro' | 'waiting' | 'signal' | 'tooSoon' | 'result';

const MIN_DELAY_MS = 1200;
const MAX_DELAY_MS = 3200;

/**
 * The sharpness check: the orb sits dark, then lights up at a random moment —
 * tap as fast as you can. A handful of trials becomes a measured reaction time,
 * a real counterpart to the app's estimated thinking condition. Fully local; it
 * times taps with `performance.now()` and never leaves the device.
 */
export function SharpnessScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const saveSharpness = useStore((s) => s.saveSharpness);

  const [phase, setPhase] = useState<Phase>('intro');
  const [done, setDone] = useState(0); // completed valid trials (for the dots)
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [result, setResult] = useState<SharpnessResult | null>(null);

  const trials = useRef<number[]>([]);
  const signalAt = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  const armWait = useCallback(() => {
    setPhase('waiting');
    clearTimer();
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timer.current = setTimeout(() => {
      signalAt.current = performance.now();
      setPhase('signal');
    }, delay);
  }, []);

  const begin = () => {
    void tapMedium();
    trials.current = [];
    setDone(0);
    setLastMs(null);
    setResult(null);
    armWait();
  };

  const finish = useCallback(
    (all: number[]) => {
      clearTimer();
      const r = buildResult(all, new Date(), uid());
      setResult(r);
      if (r) {
        void notifySuccess();
        void saveSharpness(r);
      }
      setPhase('result');
    },
    [saveSharpness],
  );

  // One tap handler for the whole stage; behaviour depends on the phase.
  const onTap = () => {
    if (phase === 'waiting') {
      // Jumped the gun — discard and re-arm.
      void tapLight();
      clearTimer();
      setPhase('tooSoon');
      timer.current = setTimeout(armWait, 900);
      return;
    }
    if (phase === 'signal') {
      const ms = performance.now() - signalAt.current;
      void tapLight();
      trials.current.push(ms);
      setLastMs(Math.round(ms));
      const count = trials.current.length;
      setDone(count);
      if (count >= SHARP_TRIALS) {
        finish([...trials.current]);
      } else {
        armWait();
      }
    }
  };

  const stageText =
    phase === 'waiting'
      ? t('sharp.wait')
      : phase === 'signal'
        ? t('sharp.now')
        : phase === 'tooSoon'
          ? t('sharp.tooSoon')
          : lastMs != null
            ? `${lastMs}`
            : '';

  return (
    <div className="app-frame" style={{ background: 'var(--bg)' }}>
      <div className="sharp-wrap">
        {/* Announce the actionable moments to screen readers. */}
        <div className="sr-only" role="status" aria-live="assertive">
          {phase === 'signal'
            ? t('sharp.now')
            : phase === 'tooSoon'
              ? t('sharp.tooSoon')
              : ''}
        </div>
        <div className="sharp-head">
          <h1 className="sharp-title">{t('sharp.title')}</h1>
          <p className="sharp-note">
            {phase === 'intro'
              ? t('sharp.intro')
              : phase === 'result'
                ? t('sharp.resultNote')
                : t('sharp.guide')}
          </p>
        </div>

        {phase === 'intro' && (
          <div className="sharp-foot">
            <Button variant="primary" block large onClick={begin}>
              {t('sharp.start')}
            </Button>
            <button className="back-btn" onClick={onClose}>
              {t('common.back')}
            </button>
          </div>
        )}

        {(phase === 'waiting' || phase === 'signal' || phase === 'tooSoon') && (
          <>
            <button
              type="button"
              className="sharp-orb"
              data-phase={phase}
              onClick={onTap}
              aria-label={stageText}
            >
              <span className="sharp-orb-text num">{stageText}</span>
            </button>
            <div className="wind-dots" aria-hidden="true">
              {Array.from({ length: SHARP_TRIALS }, (_, i) => (
                <span key={i} className="wind-dot" data-on={i < done} />
              ))}
            </div>
            <p className="sharp-hint muted">{t('sharp.tapHint')}</p>
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="sharp-result">
              {result ? (
                <>
                  <div className={`sharp-score num cond-${sharpnessTier(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="sharp-tier">
                    {t(`sharp.tier.${sharpnessTier(result.score)}`)}
                  </div>
                  <div className="sharp-metrics num">
                    {t('sharp.median', { ms: result.medianMs })}
                    {' · '}
                    {t('sharp.best', { ms: result.bestMs })}
                  </div>
                </>
              ) : (
                <p className="muted">{t('sharp.invalid')}</p>
              )}
            </div>
            <div className="sharp-foot">
              <Button variant="primary" block large onClick={begin}>
                {t('sharp.again')}
              </Button>
              <button className="back-btn" onClick={onClose}>
                {t('common.back')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
