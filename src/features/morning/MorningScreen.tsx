import { useEffect, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import { MoodPicker } from '../../components/MoodPicker';
import type { Mood } from '../../domain/types';
import { isoToHm } from '../../domain/format';
import { notifySuccess } from '../../lib/haptics';
import { useT } from '../../i18n/useT';
import { useLang } from '../../i18n/useT';
import { formatDuration } from '../../i18n/catalog';

export function MorningScreen() {
  const t = useT();
  const lang = useLang();
  const pending = useStore((s) => s.pendingMorning);
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
