import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import { MoodPicker } from '../../components/MoodPicker';
import type { Mood } from '../../domain/types';
import { isoToHm } from '../../domain/format';
import { notifySuccess } from '../../lib/haptics';
import { usePrefersReducedMotion } from '../../app/useReducedMotion';
import { useT } from '../../i18n/useT';
import { useLang } from '../../i18n/useT';
import { formatDuration } from '../../i18n/catalog';

const COUNT_UP_MS = 1100;

/**
 * The post-save reveal: the confirmed quality score counts up from zero — a
 * small payoff for finishing the morning check. Counts instantly under
 * prefers-reduced-motion.
 */
function ScoreReveal({ score, onDone }: { score: number; onDone: () => void }) {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? score : 0);
  const startTs = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // Land on the final number without animating (async to keep the render
      // path pure — no sync setState inside the effect).
      const raf = requestAnimationFrame(() => setShown(score));
      return () => cancelAnimationFrame(raf);
    }
    let raf = 0;
    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      const p = Math.min(1, (ts - startTs.current) / COUNT_UP_MS);
      // Ease-out: fast start, gentle landing on the final number.
      setShown(Math.round(score * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reducedMotion]);

  return (
    <div className="app-frame">
      <div className="screen morning-wrap" style={{ justifyContent: 'center' }}>
        <EyeMark size={72} color="var(--primary)" open />
        <div className="morning-reveal">
          <span className="stat-label">{t('morning.scoreTitle')}</span>
          <div className="morning-score num" role="status">
            {shown}
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {t('morning.scoreCopy')}
          </p>
        </div>
        <Button block large onClick={onDone}>
          {t('morning.begin')}
        </Button>
      </div>
    </div>
  );
}

export function MorningScreen() {
  const t = useT();
  const lang = useLang();
  const pending = useStore((s) => s.pendingMorning);
  const morningResult = useStore((s) => s.morningResult);
  const clearMorningResult = useStore((s) => s.clearMorningResult);
  const saveMorningCheck = useStore((s) => s.saveMorningCheck);
  const dismissMorning = useStore((s) => s.dismissMorning);

  const [eyeOpen, setEyeOpen] = useState(false);
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [subjective, setSubjective] = useState(3);
  const [note, setNote] = useState('');
  const [theme, setTheme] = useState('');

  // Closed → open micro-interaction on mount.
  useEffect(() => {
    const t = setTimeout(() => setEyeOpen(true), 250);
    return () => clearTimeout(t);
  }, []);

  // After a successful save the check screen gives way to the score reveal.
  if (morningResult != null) {
    return <ScoreReveal score={morningResult} onDone={clearMorningResult} />;
  }

  if (!pending) return null;

  const save = async () => {
    if (!mood) return;
    await saveMorningCheck({ mood, subjective, note, theme });
    void notifySuccess();
  };

  return (
    <div className="app-frame">
      <div className="screen morning-wrap">
        <EyeMark size={72} color="var(--primary)" open={eyeOpen} />
        <div style={{ textAlign: 'center' }}>
          <h1 className="display" style={{ fontSize: 26, letterSpacing: '0.04em' }}>
            {t('morning.greeting')}
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {isoToHm(pending.startedAt)} → {isoToHm(pending.endedAt)}
          </p>
          <div className="morning-dur num">
            {formatDuration(pending.durationMin, lang)}
          </div>
          {pending.movements && (
            <p className="muted" style={{ marginTop: 4 }}>
              {t('morning.movements', { count: pending.movements.length })}
            </p>
          )}
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="stat-label">{t('morning.condition')}</span>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="field" style={{ width: '100%' }}>
          <label>{t('morning.subjective')}</label>
          <input
            className="input"
            type="range"
            min={1}
            max={5}
            value={subjective}
            onChange={(e) => setSubjective(Number(e.target.value))}
          />
          <span className="muted num" style={{ alignSelf: 'center' }}>
            {subjective}
          </span>
        </div>

        <div className="field" style={{ width: '100%' }}>
          <label>{t('morning.theme')}</label>
          <input
            className="input"
            value={theme}
            placeholder={t('morning.themePlaceholder')}
            maxLength={60}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>

        <div className="field" style={{ width: '100%' }}>
          <label>{t('morning.note')}</label>
          <textarea
            className="textarea"
            value={note}
            placeholder={t('morning.notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button block large disabled={!mood} onClick={() => void save()}>
            {t('morning.save')}
          </Button>
          <Button variant="ghost" block onClick={dismissMorning}>
            {t('morning.later')}
          </Button>
        </div>
      </div>
    </div>
  );
}
