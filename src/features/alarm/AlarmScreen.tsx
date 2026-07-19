import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Toggle } from '../../components/Toggle';
import { AlarmEditor } from './AlarmEditor';
import type { AlarmConfig, Lang } from '../../domain/types';
import { subtractMinutesHm, weekdayName } from '../../domain/format';
import { recommendedBedtime } from '../../domain/bedtime';
import { useT, useLang } from '../../i18n/useT';
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

/* ── The night orbit ────────────────────────────────────────────
   A 24-hour ring, midnight at the top. The planned night is drawn
   as a violet arc from ☾ (bed) to the open eye (wake); every
   enabled alarm sits on the ring as a point of light. */

const R = 112;
const C = 140;

function angleOf(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return ((h * 60 + m) / 1440) * Math.PI * 2 - Math.PI / 2;
}
function ptOf(hm: string, r = R): [number, number] {
  const a = angleOf(hm);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function NightOrbit({
  bed,
  wake,
  alarms,
  t,
}: {
  bed: string;
  wake: string;
  alarms: AlarmConfig[];
  t: (key: string) => string;
}) {
  const [bx, by] = ptOf(bed);
  const [wx, wy] = ptOf(wake);
  // Night length in minutes, walking clockwise from bed to wake.
  const toMin = (hm: string) => {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
  };
  const span = (toMin(wake) - toMin(bed) + 1440) % 1440;
  const largeArc = span > 720 ? 1 : 0;

  return (
    <svg
      className="orbit"
      viewBox="0 0 280 280"
      role="img"
      aria-label={`${t('alarm.bed')} ${bed} — ${t('alarm.wake')} ${wake}`}
    >
      {/* the 24h ring + quarter marks */}
      <circle cx={C} cy={C} r={R} className="orbit-ring" />
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = ptOf(`${h}:00`, R + 14);
        return (
          <text key={h} x={x} y={y + 3} className="orbit-tick num">
            {h}
          </text>
        );
      })}

      {/* the planned night */}
      {span > 0 && (
        <path
          d={`M ${bx} ${by} A ${R} ${R} 0 ${largeArc} 1 ${wx} ${wy}`}
          className="orbit-night"
        />
      )}

      {/* bed = moon */}
      <text x={bx} y={by + 5} className="orbit-glyph">
        ☾
      </text>
      {/* wake = open eye */}
      <circle cx={wx} cy={wy} r={7.5} className="orbit-wake-ring" />
      <circle cx={wx} cy={wy} r={2.6} className="orbit-wake-dot" />

      {/* every other enabled alarm, as a small light on the ring */}
      {alarms
        .filter((a) => a.enabled && a.time !== wake)
        .map((a) => {
          const [x, y] = ptOf(a.time);
          return <circle key={a.id} cx={x} cy={y} r={3} className="orbit-alarm" />;
        })}

      {/* center: the two anchors of the night */}
      <text x={C} y={C - 16} className="orbit-center-label">
        {t('alarm.wake')}
      </text>
      <text x={C} y={C + 10} className="orbit-center-time num">
        {wake}
      </text>
      <text x={C} y={C + 34} className="orbit-center-sub num">
        ☾ {bed}
      </text>
    </svg>
  );
}

/* Repeat days as seven small dots (never a sentence). */
function DayDots({ days, lang }: { days: number[]; lang: Lang }) {
  return (
    <span className="day-dots" aria-hidden="true">
      {Array.from({ length: 7 }, (_, d) => (
        <span key={d} className="day-dot" data-on={days.includes(d)}>
          {weekdayName(d, lang)}
        </span>
      ))}
    </span>
  );
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

  const wake =
    alarms
      .filter((a) => a.enabled)
      .map((a) => a.time)
      .sort()[0] ?? settings.defaultWakeTime;
  const bedtimePlan = settings.bedtimeReminder
    ? recommendedBedtime({
        wakeTime: wake,
        targetMin: settings.targetDurationMin,
        debtMin: sleepDebtMin(sessions, settings.targetDurationMin),
      })
    : undefined;
  const bed =
    bedtimePlan?.bedtimeHm ?? subtractMinutesHm(wake, settings.targetDurationMin);

  return (
    <div className="screen">
      <div className="spread">
        <h1 className="screen-title">{t('alarm.title')}</h1>
        <button
          className="icon-btn"
          aria-label={t('alarm.add')}
          onClick={() => void openNew()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <NightOrbit bed={bed} wake={wake} alarms={alarms} t={t} />

      {alarms.length === 0 ? (
        <p className="empty">{t('alarm.empty')}</p>
      ) : (
        <div className="alarm-list">
          {alarms.map((a) => (
            <div key={a.id} className="alarm-row" data-off={!a.enabled}>
              <button
                className="alarm-row-main"
                onClick={() => {
                  setIsNew(false);
                  setEditing(a);
                }}
              >
                <span className="alarm-time num">{a.time}</span>
                <DayDots days={a.repeatDays} lang={lang} />
              </button>
              <Toggle
                on={a.enabled}
                onChange={(enabled) => void saveAlarm({ ...a, enabled })}
                label={t('alarm.enableAria', { time: a.time })}
              />
            </div>
          ))}
        </div>
      )}

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
