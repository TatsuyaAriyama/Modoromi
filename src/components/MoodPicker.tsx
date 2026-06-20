import type { Mood } from '../domain/types';
import './ui.css';
import { tapLight } from '../lib/haptics';

const OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'fresh', label: 'すっきり', emoji: '🌤' },
  { value: 'normal', label: 'ふつう', emoji: '🌥' },
  { value: 'groggy', label: 'だるい', emoji: '🌫' },
];

export function MoodPicker({
  value,
  onChange,
}: {
  value?: Mood;
  onChange: (m: Mood) => void;
}) {
  return (
    <div className="mood" role="radiogroup" aria-label="今朝のコンディション">
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
          <span className="mood-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
