import { parseHm } from '../domain/format';
import './ui.css';
import { tapLight } from '../lib/haptics';

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
  const { hour, minute } = parseHm(value);

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
          aria-label="時を増やす"
          onClick={() => set(hour + 1, minute)}
        >
          ▲
        </button>
        <span className="dial-val num">{String(hour).padStart(2, '0')}</span>
        <button
          type="button"
          className="dial-step"
          aria-label="時を減らす"
          onClick={() => set(hour - 1, minute)}
        >
          ▼
        </button>
      </div>
      <span className="dial-sep num">:</span>
      <div className="dial-col">
        <button
          type="button"
          className="dial-step"
          aria-label="分を増やす"
          onClick={() => set(hour, minute + minuteStep)}
        >
          ▲
        </button>
        <span className="dial-val num">{String(minute).padStart(2, '0')}</span>
        <button
          type="button"
          className="dial-step"
          aria-label="分を減らす"
          onClick={() => set(hour, minute - minuteStep)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
