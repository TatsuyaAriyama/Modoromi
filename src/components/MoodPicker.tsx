import type { Mood } from '../domain/types';
import './ui.css';
import { tapLight } from '../lib/haptics';
import { useT } from '../i18n/useT';

const OPTIONS: { value: Mood; emoji: string }[] = [
  { value: 'fresh', emoji: '🌤' },
  { value: 'normal', emoji: '🌥' },
  { value: 'groggy', emoji: '🌫' },
];

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
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="mood-opt"
          role="radio"
          aria-checked={value === o.value}
          data-selected={value === o.value}
          onClick={() => {
            void tapLight();
            onChange(o.value);
          }}
        >
          <span className="mood-emoji" aria-hidden="true">
            {o.emoji}
          </span>
          <span className="mood-label">{t(`mood.${o.value}`)}</span>
        </button>
      ))}
    </div>
  );
}
