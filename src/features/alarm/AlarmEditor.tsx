import { useState } from 'react';
import '../screens.css';
import type { AlarmConfig } from '../../domain/types';
import { weekdayJa } from '../../domain/format';
import { Button } from '../../components/Button';
import { TimeDial } from '../../components/TimeDial';
import { Toggle } from '../../components/Toggle';

export function AlarmEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: AlarmConfig;
  onSave: (a: AlarmConfig) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AlarmConfig>(initial);

  const toggleDay = (d: number) => {
    setDraft((s) => ({
      ...s,
      repeatDays: s.repeatDays.includes(d)
        ? s.repeatDays.filter((x) => x !== d)
        : [...s.repeatDays, d].sort(),
    }));
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <h2 style={{ fontSize: 18 }}>アラーム</h2>
          <button className="back-btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TimeDial
            value={draft.time}
            onChange={(time) => setDraft((s) => ({ ...s, time }))}
            minuteStep={1}
          />
        </div>

        <div className="field">
          <label>繰り返し</label>
          <div className="daypick">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                className="day-chip"
                data-on={draft.repeatDays.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {weekdayJa(d)}
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            未選択なら次回のみ（単発）
          </span>
        </div>

        <div className="set-row">
          <span className="set-label">スヌーズ</span>
          <Toggle
            on={draft.snoozeEnabled}
            onChange={(snoozeEnabled) =>
              setDraft((s) => ({ ...s, snoozeEnabled }))
            }
            label="スヌーズ"
          />
        </div>
        {draft.snoozeEnabled && (
          <div className="set-row">
            <span className="set-label">スヌーズ間隔</span>
            <select
              className="select"
              style={{ width: 120 }}
              value={draft.snoozeMinutes}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  snoozeMinutes: Number(e.target.value),
                }))
              }
            >
              {[5, 10, 15].map((m) => (
                <option key={m} value={m}>
                  {m}分
                </option>
              ))}
            </select>
          </div>
        )}

        <Button block large onClick={() => onSave(draft)}>
          保存
        </Button>
        {onDelete && (
          <Button variant="danger" block onClick={onDelete}>
            このアラームを削除
          </Button>
        )}
      </div>
    </div>
  );
}
