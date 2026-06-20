import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Toggle } from '../../components/Toggle';
import { AlarmEditor } from './AlarmEditor';
import type { AlarmConfig } from '../../domain/types';
import { weekdayJa } from '../../domain/format';
import { recommendedBedtime } from '../../domain/bedtime';
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

function repeatLabel(days: number[]): string {
  if (days.length === 0) return '単発';
  if (days.length === 7) return '毎日';
  return days.map(weekdayJa).join('・');
}

export function AlarmScreen() {
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
      <h1 className="screen-title">アラーム</h1>

      {reminderTime && (
        <Card tight>
          <div className="spread">
            <div>
              <div className="stat-label">就寝リマインダー</div>
              <div className="alarm-time num" style={{ fontSize: 22 }}>
                {reminderTime}
              </div>
            </div>
            <span className="pill">
              {bedtimePlan && bedtimePlan.recoveryMin > 0
                ? '回復のため早め'
                : '目標から逆算'}
            </span>
          </div>
        </Card>
      )}

      {alarms.length === 0 ? (
        <Card>
          <p className="empty">アラームはまだありません</p>
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
                  {repeatLabel(a.repeatDays)}
                  {a.snoozeEnabled ? ` ・ スヌーズ${a.snoozeMinutes}分` : ''}
                </div>
              </button>
              <Toggle
                on={a.enabled}
                onChange={(enabled) => void saveAlarm({ ...a, enabled })}
                label={`${a.time} を有効化`}
              />
            </div>
          ))}
        </Card>
      )}

      <Button block large onClick={() => void openNew()}>
        ＋ アラームを追加
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
