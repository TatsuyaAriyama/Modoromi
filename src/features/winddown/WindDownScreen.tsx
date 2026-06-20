import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import {
  WIND_DOWN_BREATHS,
  breathAt,
  type BreathState,
} from '../../domain/breath';
import { tapMedium } from '../../lib/haptics';
import { useT } from '../../i18n/useT';

/**
 * A short paced-breathing ritual before a sleep session. Optional and
 * skippable — the goal is to let the mind settle, not to gate the night.
 */
export function WindDownScreen({
  onStart,
  onClose,
}: {
  onStart: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<BreathState>(() => breathAt(0));
  const startTs = useRef<number | null>(null);

  // Drive the breathing animation off the rAF timestamp (no impure clock reads
  // in render). The first frame anchors the start so elapsed begins at zero.
  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      setState(breathAt(ts - startTs.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const done = state.cycle >= WIND_DOWN_BREATHS;

  const start = () => {
    void tapMedium();
    onStart();
  };

  return (
    <div className="app-frame" style={{ background: 'var(--bg)' }}>
      <div className="wind-wrap">
        <div className="wind-head">
          <EyeMark size={40} color="var(--text)" />
          <h1 className="wind-title">{t('wind.title')}</h1>
          <p className="wind-note">
            {done ? t('wind.ready') : t('wind.guide')}
          </p>
        </div>

        <div className="wind-orb-wrap">
          <div
            className="wind-orb"
            style={{ transform: `scale(${state.scale})` }}
          />
          <div className="wind-cue">{t(`breath.${state.phase}`)}</div>
        </div>

        <div className="wind-dots" aria-hidden="true">
          {Array.from({ length: WIND_DOWN_BREATHS }, (_, i) => (
            <span
              key={i}
              className="wind-dot"
              data-on={i < state.cycle}
            />
          ))}
        </div>

        <div className="wind-foot">
          <Button variant="primary" block large onClick={start}>
            {t('wind.start')}
          </Button>
          <button className="back-btn" onClick={onClose}>
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
