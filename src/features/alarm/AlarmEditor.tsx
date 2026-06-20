import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import type { AlarmConfig } from '../../domain/types';
import { weekdayName } from '../../domain/format';
import { Button } from '../../components/Button';
import { TimeDial } from '../../components/TimeDial';
import { Toggle } from '../../components/Toggle';
import { ALARM_SOUNDS, AlarmPlayer, normalizeSound } from '../../lib/alarmSound';
import { useT, useLang } from '../../i18n/useT';

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
  const t = useT();
  const lang = useLang();
  const [draft, setDraft] = useState<AlarmConfig>({
    ...initial,
    sound: normalizeSound(initial.sound),
  });

  // A dedicated player for the editor's sound preview.
  const previewRef = useRef<AlarmPlayer | null>(null);
  if (previewRef.current === null) previewRef.current = new AlarmPlayer();
  useEffect(() => () => previewRef.current?.dispose(), []);
  const preview = (id: string) => previewRef.current?.preview(id);

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
          <h2 style={{ fontSize: 18 }}>{t('alarm.title')}</h2>
          <button className="back-btn" onClick={onClose}>
            {t('common.close')}
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
          <label>{t('editor.repeat')}</label>
          <div className="daypick">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                className="day-chip"
                data-on={draft.repeatDays.includes(d)}
                onClick={() => toggleDay(d)}
              >
                {weekdayName(d, lang)}
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {t('editor.repeatHint')}
          </span>
        </div>

        <div className="field">
          <label>{t('editor.sound')}</label>
          <div className="sound-row">
            <select
              className="select"
              style={{ flex: 1 }}
              value={draft.sound}
              onChange={(e) => {
                const sound = e.target.value;
                setDraft((s) => ({ ...s, sound }));
                preview(sound);
              }}
            >
              {ALARM_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(`sound.${s.id}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="back-btn"
              onClick={() => preview(draft.sound)}
            >
              {t('editor.preview')}
            </button>
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">{t('editor.snooze')}</span>
          <Toggle
            on={draft.snoozeEnabled}
            onChange={(snoozeEnabled) =>
              setDraft((s) => ({ ...s, snoozeEnabled }))
            }
            label={t('editor.snooze')}
          />
        </div>
        {draft.snoozeEnabled && (
          <div className="set-row">
            <span className="set-label">{t('editor.snoozeInterval')}</span>
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
                  {t('unit.min', { n: m })}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button block large onClick={() => onSave(draft)}>
          {t('common.save')}
        </Button>
        {onDelete && (
          <Button variant="danger" block onClick={onDelete}>
            {t('editor.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
