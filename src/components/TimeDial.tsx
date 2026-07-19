import { parseHm } from '../domain/format';
import './ui.css';
import { tapLight } from '../lib/haptics';
import { useClock, useT } from '../i18n/useT';
import { from12, to12 } from '../i18n/clock';

/** Large stepper-based "HH:mm" input. */
export function TimeDial({
  value,
  onChange,
  minuteStep = 5,
}: {
  value: string;
  onChange: (hm: string) => void;
  minuteStep?: number;
}) {
  const t = useT();
  const clock = useClock();
  const { hour, minute } = parseHm(value);

  // Display only. `set` is untouched: it always composes 24-hour "HH:mm",
  // which is what every alarm, the CSV and the JSON backup store.
  const { h: shown12, pm } = to12(hour, clock.cycle);
  const shownHour = clock.h12 ? String(shown12) : String(hour).padStart(2, '0');

  // Clamped to the current period rather than carrying: a half-asleep nudge
  // must never flip a 7am alarm to 7pm while the numerals barely move.
  const stepHour = (d: number) => {
    if (!clock.h12) return set(hour + d, minute);
    const lo = clock.cycle === 'h11' ? 0 : 1;
    const next = ((shown12 - lo + d + 12) % 12) + lo;
    set(from12(next, pm, clock.cycle), minute);
  };

  const set = (h: number, m: number) => {
    void tapLight();
    const hh = ((h % 24) + 24) % 24;
    const mm = ((m % 60) + 60) % 60;
    onChange(
      `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    );
  };

  return (
    <div className="dial">
      <div className="dial-col">
        <button
          type="button"
          className="dial-step"
          aria-label={t('dial.hourUp')}
          onClick={() => stepHour(1)}
        >
          ▲
        </button>
        <span className="dial-val num" data-h12={clock.h12 || undefined}>
          {shownHour}
        </span>
        <button
          type="button"
          className="dial-step"
          aria-label={t('dial.hourDown')}
          onClick={() => stepHour(-1)}
        >
          ▼
        </button>
      </div>
      <span className="dial-sep num">:</span>
      <div className="dial-col">
        <button
          type="button"
          className="dial-step"
          aria-label={t('dial.minUp')}
          onClick={() => set(hour, minute + minuteStep)}
        >
          ▲
        </button>
        <span className="dial-val num">{String(minute).padStart(2, '0')}</span>
        <button
          type="button"
          className="dial-step"
          aria-label={t('dial.minDown')}
          onClick={() => set(hour, minute - minuteStep)}
        >
          ▼
        </button>
      </div>
      {clock.h12 && (
        <div className="dial-period" role="group" aria-label={t('dial.period')}>
          <button
            type="button"
            data-on={!pm}
            aria-pressed={!pm}
            onClick={() => set(from12(shown12, false, clock.cycle), minute)}
          >
            {t('clock.am')}
          </button>
          <button
            type="button"
            data-on={pm}
            aria-pressed={pm}
            onClick={() => set(from12(shown12, true, clock.cycle), minute)}
          >
            {t('clock.pm')}
          </button>
        </div>
      )}
    </div>
  );
}
