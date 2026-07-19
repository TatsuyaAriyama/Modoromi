import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import { NightSky } from '../../components/NightSky';
import {
  WIND_DOWN_BREATHS,
  breathAt,
  type BreathState,
} from '../../domain/breath';
import { tapMedium } from '../../lib/haptics';
import { useT } from '../../i18n/useT';
import {
  prefersReducedMotion,
  useReducedMotion,
} from '../../app/useReducedMotion';

/** How long the plane takes to sink away before the session takes over. */
const DESCENT_MS = 900;

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
  const reduced = useReducedMotion();
  const [state, setState] = useState<BreathState>(() => breathAt(0));
  const [leaving, setLeaving] = useState(false);
  const startTs = useRef<number | null>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);

  // Drive the breathing off the rAF timestamp (no impure clock reads in
  // render). The orb's size is written straight to the DOM, so the 60fps
  // path never re-renders React; state changes only when the cue or the
  // cycle count changes — roughly once every four seconds.
  useEffect(() => {
    startTs.current = null;

    if (reduced) {
      // The ritual still runs and the cue still changes; only the orb stops
      // moving, resting at full size. A coarse timer replaces rAF so we are
      // not waking the compositor 60x a second for a circle that never moves.
      orbRef.current?.style.setProperty('transform', 'scale(1)');
      const t0 = Date.now();
      const id = setInterval(
        () => setState(breathAt(Date.now() - t0)),
        250,
      );
      return () => clearInterval(id);
    }

    let raf = 0;
    let lastPhase: string | null = null;
    let lastCycle = -1;
    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      const s = breathAt(ts - startTs.current);
      if (!leavingRef.current && orbRef.current) {
        orbRef.current.style.transform = `scale(${s.scale})`;
      }
      if (s.phase !== lastPhase || s.cycle !== lastCycle) {
        lastPhase = s.phase;
        lastCycle = s.cycle;
        setState(s);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const done = state.cycle >= WIND_DOWN_BREATHS;

  // One last exhale: the plane sinks away before the sleep screen takes over.
  const start = () => {
    if (leavingRef.current) return;
    void tapMedium();
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(onStart, prefersReducedMotion() ? 0 : DESCENT_MS);
  };

  return (
    <div className="app-frame" style={{ background: 'var(--bg)' }}>
      <NightSky />
      <div className="wind-wrap" data-leaving={leaving}>
        <div className="wind-head">
          <EyeMark size={40} color="var(--text)" />
          <h1 className="wind-title">{t('wind.title')}</h1>
          {done && <p className="wind-note">{t('wind.ready')}</p>}
        </div>

        <div className="wind-orb-wrap">
          <div ref={orbRef} className="wind-orb" />
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
