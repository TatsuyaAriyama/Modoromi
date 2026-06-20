import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Toggle } from '../../components/Toggle';
import { AlarmEditor } from './AlarmEditor';
import type { AlarmConfig } from '../../domain/types';
import { weekdayName } from '../../domain/format';
import { recommendedBedtime } from '../../domain/bedtime';
import { useT, useLang } from '../../i18n/useT';
import type { Lang } from '../../domain/types';
import { sleepDebtMin } from '../../domain/debt';
import { DEFAULT_ALARM_SOUND } from '../../lib/alarmSound';
import { uid } from '../../lib/id';
import { ensurePermission } from '../../lib/notifications';
import { isNative } from '../../lib/platform';

function newAlarm(time: string): AlarmConfig {
  return {
    id: uid(),
    time,
    repeatDays: [],
    sound: DEFAULT_ALARM_SOUND,
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
  };
}

function repeatLabel(
  days: number[],
  lang: Lang,
  t: (key: string) => string,
  sep: string,
): string {
  if (days.length === 0) return t('alarm.repeatOnce');
  if (days.length === 7) return t('alarm.repeatDaily');
  return days.map((d) => weekdayName(d, lang)).join(sep);
}

export function AlarmScreen() {
  const t = useT();
  const lang = useLang();
  const alarms = useStore((s) => s.alarms);
  const settings = useStore((s) => s.settings);
  const sessions = useStore((s) => s.sessions);
  const saveAlarm = useStore((s) => s.saveAlarm);
  const deleteAlarm = useStore((s) => s.deleteAlarm);

  const [editing, setEditing] = useState<AlarmConfig | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = async () => {
    if (isNative()) await ensurePermission();
    setIsNew(true);
    setEditing(newAlarm(settings.defaultWakeTime));
  };

  const bedtimePlan = settings.bedtimeReminder
    ? recommendedBedtime({
        wakeTime: settings.defaultWakeTime,
        targetMin: settings.targetDurationMin,
        debtMin: sleepDebtMin(sessions, settings.targetDurationMin),
      })
    : undefined;
  const reminderTime = bedtimePlan?.bedtimeHm;

  return (
    <div className="screen">
      <h1 className="screen-title">{t('alarm.title')}</h1>

      {reminderTime && (
        <Card tight>
          <div className="spread">
            <div>
              <div className="stat-label">{t('home.bedtimeReminder')}</div>
              <div className="alarm-time num" style={{ fontSize: 22 }}>
                {reminderTime}
              </div>
            </div>
            <span className="pill">
              {bedtimePlan && bedtimePlan.recoveryMin > 0
                ? t('alarm.recoveryEarly')
                : t('alarm.fromTarget')}
            </span>
          </div>
        </Card>
      )}

      {alarms.length === 0 ? (
        <Card>
          <p className="empty">{t('alarm.empty')}</p>
        </Card>
      ) : (
        <Card>
          {alarms.map((a, i) => (
            <div
              key={a.id}
              className="alarm-item"
              data-off={!a.enabled}
              style={{
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: 12,
                borderBottom:
                  i === alarms.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              <button
                style={{ background: 'none', border: 'none', textAlign: 'left', color: 'inherit', flex: 1 }}
                onClick={() => {
                  setIsNew(false);
                  setEditing(a);
                }}
              >
                <div className="alarm-time num">{a.time}</div>
                <div className="alarm-meta">
                  {repeatLabel(a.repeatDays, lang, t, t('sep.middot'))}
                  {a.snoozeEnabled
                    ? t('alarm.snoozeMeta', { min: a.snoozeMinutes })
                    : ''}
                </div>
              </button>
              <Toggle
                on={a.enabled}
                onChange={(enabled) => void saveAlarm({ ...a, enabled })}
                label={t('alarm.enableAria', { time: a.time })}
              />
            </div>
          ))}
        </Card>
      )}

      <Button block large onClick={() => void openNew()}>
        {t('alarm.add')}
      </Button>

      {editing && (
        <AlarmEditor
          initial={editing}
          onSave={(a) => {
            void saveAlarm(a);
            setEditing(null);
          }}
          onDelete={
            isNew
              ? undefined
              : () => {
                  void deleteAlarm(editing.id);
                  setEditing(null);
                }
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
