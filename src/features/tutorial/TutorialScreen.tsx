import { useState, type ReactNode } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { tapMedium } from '../../lib/haptics';
import { useT } from '../../i18n/useT';

/** Quiet line-art for each slide, in the onboarding's mist tone. */
const stroke = {
  fill: 'none',
  stroke: 'var(--mist)',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function HomeArt(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" width={68} height={68} {...stroke}>
      <rect x="12" y="10" width="40" height="18" rx="4" />
      <line x1="18" y1="17" x2="34" y2="17" />
      <line x1="18" y1="22" x2="28" y2="22" />
      <rect x="12" y="34" width="18" height="20" rx="4" />
      <rect x="34" y="34" width="18" height="20" rx="4" />
    </svg>
  );
}

function ChartArt(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" width={68} height={68} {...stroke}>
      <polyline points="10,40 22,30 34,36 54,16" />
      <circle cx="22" cy="30" r="2" />
      <circle cx="34" cy="36" r="2" />
      <line x1="10" y1="52" x2="54" y2="52" />
    </svg>
  );
}

function SparkArt(): ReactNode {
  return (
    <svg viewBox="0 0 64 64" width={68} height={68} {...stroke}>
      <path d="M32 12 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 z" />
      <circle cx="50" cy="18" r="2.5" />
    </svg>
  );
}

interface Slide {
  key: string;
  art: ReactNode;
}

const SLIDES: Slide[] = [
  { key: 'welcome', art: <EyeMark size={84} color="var(--mist)" /> },
  { key: 'home', art: <HomeArt /> },
  { key: 'sleep', art: <EyeMark size={84} color="var(--mist)" /> },
  { key: 'review', art: <ChartArt /> },
  { key: 'extras', art: <SparkArt /> },
];

/**
 * A short, swipe-through feature tour shown once after onboarding. Optional and
 * skippable; finishing (or skipping) marks it seen. Replayable from Settings.
 */
export function TutorialScreen() {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);

  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;

  const done = () => {
    void saveSettings({ ...settings, tutorialSeen: true });
  };
  const next = () => {
    void tapMedium();
    if (last) done();
    else setStep((s) => s + 1);
  };

  const slide = SLIDES[step];

  return (
    <div className="onb">
      <div className="onb-inner">
        <div className="onb-body">
          <div className="tut-art" aria-hidden="true">
            {slide.art}
          </div>
          <h1 className="onb-title" style={{ fontSize: 26 }}>
            {t(`tutorial.${slide.key}.title`)}
          </h1>
          <p className="onb-copy">{t(`tutorial.${slide.key}.body`)}</p>
        </div>

        <div className="onb-foot">
          <div className="onb-dots" aria-hidden="true">
            {SLIDES.map((s, i) => (
              <span key={s.key} className="onb-dot" data-on={i === step} />
            ))}
          </div>
          <button className="btn btn-onb btn-block btn-lg" onClick={next}>
            {last ? t('tutorial.start') : t('common.next')}
          </button>
          <button className="btn btn-onb-ghost btn-block" onClick={done}>
            {t('tutorial.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
