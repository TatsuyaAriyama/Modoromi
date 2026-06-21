import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import {
  BREATH_PATTERNS,
  DEFAULT_BREATH_PATTERN,
  breathAt,
  breathPattern,
  type BreathState,
} from '../../domain/breath';
import {
  SOUNDSCAPES,
  DEFAULT_SOUNDSCAPE,
  SoundscapePlayer,
} from '../../lib/soundscape';
import { tapLight, tapMedium } from '../../lib/haptics';
import { usePrefersReducedMotion } from '../../app/useReducedMotion';
import { useT } from '../../i18n/useT';

/**
 * A short paced-breathing ritual before a sleep session. Optional and
 * skippable — the goal is to let the mind settle, not to gate the night.
 * The pace (balanced box vs. the sedating 4-7-8) and an optional ambient
 * soundscape are both the sleeper's choice.
 */
export function WindDownScreen({
  onStart,
  onClose,
}: {
  onStart: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const [patternId, setPatternId] = useState(DEFAULT_BREATH_PATTERN);
  const [sound, setSound] = useState(DEFAULT_SOUNDSCAPE);
  const [state, setState] = useState<BreathState>(() => breathAt(0));
  const startTs = useRef<number | null>(null);

  const pattern = breathPattern(patternId);

  // One soundscape player for the screen's lifetime; disposed on leave.
  const soundRef = useRef<SoundscapePlayer | null>(null);
  if (soundRef.current === null) soundRef.current = new SoundscapePlayer();
  useEffect(() => {
    const player = soundRef.current;
    return () => player?.dispose();
  }, []);

  // Drive the breathing animation off the rAF timestamp (no impure clock reads
  // in render). The first frame anchors the start so elapsed begins at zero.
  // Re-anchors when the pace changes so a switch restarts the ritual cleanly.
  useEffect(() => {
    startTs.current = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      setState(breathAt(ts - startTs.current, pattern.config));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pattern]);

  const done = state.cycle >= pattern.breaths;

  const pickSound = (id: string) => {
    void tapLight();
    setSound(id);
    soundRef.current?.start(id);
  };

  const start = () => {
    void tapMedium();
    soundRef.current?.stop();
    onStart();
  };

  const close = () => {
    soundRef.current?.stop();
    onClose();
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

        <div className="wind-controls">
          <div className="seg" role="group" aria-label={t('wind.pace')}>
            {BREATH_PATTERNS.map((p) => (
              <button
                key={p.id}
                data-on={p.id === patternId}
                aria-pressed={p.id === patternId}
                onClick={() => {
                  void tapLight();
                  setPatternId(p.id);
                }}
              >
                {t(`breath.pace.${p.id}`)}
              </button>
            ))}
          </div>
          <div
            className="wind-sounds"
            role="group"
            aria-label={t('wind.sound')}
          >
            {SOUNDSCAPES.map((s) => (
              <button
                key={s.id}
                className="chip"
                data-on={s.id === sound}
                aria-pressed={s.id === sound}
                onClick={() => pickSound(s.id)}
              >
                {t(`sound.${s.id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="wind-orb-wrap">
          {/* Reduced motion: hold the orb steady; the cue text still guides the
              breath so the ritual works without the pulsing animation. */}
          <div
            className="wind-orb"
            style={{ transform: `scale(${reducedMotion ? 0.82 : state.scale})` }}
          />
          <div className="wind-cue">{t(`breath.${state.phase}`)}</div>
        </div>

        <div className="wind-dots" aria-hidden="true">
          {Array.from({ length: pattern.breaths }, (_, i) => (
            <span key={i} className="wind-dot" data-on={i < state.cycle} />
          ))}
        </div>

        <div className="wind-foot">
          <Button variant="primary" block large onClick={start}>
            {t('wind.start')}
          </Button>
          <button className="back-btn" onClick={close}>
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
