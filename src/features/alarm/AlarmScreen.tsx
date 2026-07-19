import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { prefersReducedMotion } from '../../app/useReducedMotion';
import { Toggle } from '../../components/Toggle';
import { AlarmEditor } from './AlarmEditor';
import type { AlarmConfig, Lang } from '../../domain/types';
import { subtractMinutesHm, weekdayName } from '../../domain/format';
import { recommendedBedtime } from '../../domain/bedtime';
import { nextAlarmFor } from '../../domain/alarmFire';
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
const MIN_PER_DAY = 1440;
const TWEEN_MS = 900;

function toMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}
function ptOfMin(min: number, r = R): [number, number] {
  const a = (min / MIN_PER_DAY) * Math.PI * 2 - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}
function ptOf(hm: string, r = R): [number, number] {
  return ptOfMin(toMin(hm), r);
}

/** Everything the orbit draws, derived from two clock positions. */
function geomOf(bedMin: number, wakeMin: number) {
  const [bx, by] = ptOfMin(bedMin);
  const [wx, wy] = ptOfMin(wakeMin);
  const span = (wakeMin - bedMin + MIN_PER_DAY) % MIN_PER_DAY;
  return {
    bx,
    by,
    wx,
    wy,
    d: `M ${bx} ${by} A ${R} ${R} 0 ${span > 720 ? 1 : 0} 1 ${wx} ${wy}`,
    // Arc length WITHOUT touching the DOM: a circular arc of radius R
    // subtending θ has length R·θ. Keeps this jsdom-safe.
    arcLen: R * (span / MIN_PER_DAY) * Math.PI * 2,
  };
}

/** Interpolate between two clock minutes the shortest way round the dial. */
function lerpClock(a: number, b: number, k: number): number {
  const d = ((b - a + MIN_PER_DAY * 1.5) % MIN_PER_DAY) - MIN_PER_DAY / 2;
  return (a + d * k + MIN_PER_DAY) % MIN_PER_DAY;
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function NightOrbit({
  bed,
  wake,
  alarms,
  skipId,
  t,
}: {
  bed: string;
  wake: string;
  alarms: AlarmConfig[];
  /** The alarm already drawn as the waking eye; not repeated as a ring dot. */
  skipId?: string;
  t: (key: string) => string;
}) {
  const arcRef = useRef<SVGPathElement>(null);
  const moonRef = useRef<SVGTextElement>(null);
  const wakeRingRef = useRef<SVGCircleElement>(null);
  const wakeDotRef = useRef<SVGCircleElement>(null);

  // React always renders the TRUE geometry. When a time changes, this effect
  // temporarily overrides the DOM to show the bodies travelling there along
  // the orbit, and its last frame lands exactly on what React already drew —
  // so the two can never disagree, and React stays out of the frame loop.
  const prevRef = useRef<{ bedMin: number; wakeMin: number } | null>(null);

  useEffect(() => {
    const to = { bedMin: toMin(bed), wakeMin: toMin(wake) };
    const from = prevRef.current;
    prevRef.current = to;
    if (!from || (from.bedMin === to.bedMin && from.wakeMin === to.wakeMin)) {
      return;
    }
    // CSS cannot reach rAF — this is the gate the media query can't provide.
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      return;
    }
    let id = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / TWEEN_MS);
      const e = easeOut(k);
      const g = geomOf(
        lerpClock(from.bedMin, to.bedMin, e),
        lerpClock(from.wakeMin, to.wakeMin, e),
      );
      arcRef.current?.setAttribute('d', g.d);
      arcRef.current?.setAttribute('stroke-dasharray', String(g.arcLen));
      moonRef.current?.setAttribute('x', String(g.bx));
      moonRef.current?.setAttribute('y', String(g.by + 5));
      for (const r of [wakeRingRef, wakeDotRef]) {
        r.current?.setAttribute('cx', String(g.wx));
        r.current?.setAttribute('cy', String(g.wy));
      }
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [bed, wake]);

  const bedMin = toMin(bed);
  const wakeMin = toMin(wake);
  const { bx, by, wx, wy, d, arcLen } = geomOf(bedMin, wakeMin);
  const span = (wakeMin - bedMin + MIN_PER_DAY) % MIN_PER_DAY;

  return (
    <svg
      className="orbit"
      viewBox="0 0 280 280"
      role="img"
      aria-label={`${t('alarm.bed')} ${bed} — ${t('alarm.wake')} ${wake}`}
      style={{ '--arc-len': arcLen } as CSSProperties}
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

      {/* the planned night, unspooling from bed to wake */}
      {span > 0 && (
        <path
          ref={arcRef}
          d={d}
          className="orbit-night"
          strokeDasharray={arcLen}
        />
      )}

      {/* bed = moon */}
      <text ref={moonRef} x={bx} y={by + 5} className="orbit-glyph">
        ☾
      </text>
      {/* wake = open eye */}
      <circle ref={wakeRingRef} cx={wx} cy={wy} r={7.5} className="orbit-wake-ring" />
      <circle ref={wakeDotRef} cx={wx} cy={wy} r={2.6} className="orbit-wake-dot" />

      {/* every other enabled alarm, as a small light on the ring */}
      {alarms
        .filter((a) => a.enabled && a.id !== skipId)
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

  // The alarm that will actually ring next, not the earliest clock string —
  // a weekdays-only 06:30 must not anchor the orbit on a Saturday night.
  // `screenNow` is captured once so render never reads the clock.
  const [screenNow] = useState(() => new Date());
  const next = nextAlarmFor(alarms, screenNow);
  const wake = next?.alarm.time ?? settings.defaultWakeTime;
  const nextId = next?.alarm.id;
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

      <NightOrbit bed={bed} wake={wake} alarms={alarms} skipId={nextId} t={t} />

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
