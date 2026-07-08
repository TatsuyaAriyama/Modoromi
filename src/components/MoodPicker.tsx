import { useRef } from 'react';
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
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const pick = (m: Mood) => {
    void tapLight();
    onChange(m);
  };

  // Radiogroup keyboard convention: arrows move selection and focus together.
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (index + 1) % OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (index - 1 + OPTIONS.length) % OPTIONS.length;
    }
    if (next === null) return;
    e.preventDefault();
    pick(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="mood" role="radiogroup" aria-label={t('mood.aria')}>
      {OPTIONS.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          className="mood-opt"
          role="radio"
          aria-checked={value === o.value}
          data-selected={value === o.value}
          /* Roving tabindex: one tab stop for the whole group. */
          tabIndex={value === o.value || (value === undefined && i === 0) ? 0 : -1}
          onClick={() => pick(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
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
