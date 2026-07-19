import type { Mood } from '../domain/types';
import './ui.css';
import { tapLight } from '../lib/haptics';
import { useT } from '../i18n/useT';

/* Brand eye glyphs instead of emoji — open / half-lidded / closed heavy,
   matching the EyeMark motif. currentColor follows the selection state. */
function MoodGlyph({ mood }: { mood: Mood }) {
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 7,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
      {mood === 'fresh' && (
        <g {...stroke}>
          <path d="M18 54 Q50 26 82 54" />
          <circle cx="50" cy="55" r="10" fill="currentColor" stroke="none" />
        </g>
      )}
      {mood === 'normal' && (
        <g {...stroke}>
          <path d="M18 50 Q50 40 82 50" />
          <path d="M42 62 A10 10 0 0 0 58 62" />
        </g>
      )}
      {mood === 'groggy' && (
        <g {...stroke}>
          <path d="M18 46 Q50 66 82 46" />
          <line x1="34" y1="60" x2="30" y2="70" />
          <line x1="50" y1="64" x2="50" y2="75" />
          <line x1="66" y1="60" x2="70" y2="70" />
        </g>
      )}
    </svg>
  );
}

const OPTIONS: Mood[] = ['fresh', 'normal', 'groggy'];

export function MoodPicker({
  value,
  onChange,
}: {
  value?: Mood;
  onChange: (m: Mood) => void;
}) {
  const t = useT();
  return (
    <div className="mood" role="radiogroup" aria-label={t('mood.aria')}>
      {OPTIONS.map((mood) => (
        <button
          key={mood}
          type="button"
          className="mood-opt"
          role="radio"
          aria-checked={value === mood}
          data-selected={value === mood}
          onClick={() => {
            void tapLight();
            onChange(mood);
          }}
        >
          <span className="mood-emoji" aria-hidden="true">
            <MoodGlyph mood={mood} />
          </span>
          <span className="mood-label">{t(`mood.${mood}`)}</span>
        </button>
      ))}
    </div>
  );
}
