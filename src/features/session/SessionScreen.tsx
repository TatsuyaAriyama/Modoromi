import { useCallback, useEffect, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { Toggle } from '../../components/Toggle';
import { Button } from '../../components/Button';
import { disableKeepAwake, enableKeepAwake } from '../../lib/keepAwake';
import { notifySuccess } from '../../lib/haptics';
import { MotionRecorder, ensureMotionPermission } from '../../lib/motion';
import { AlarmPlayer, DEFAULT_ALARM_SOUND } from '../../lib/alarmSound';
import { shouldSmartWake } from '../../domain/motion';
import { isAlarmDue } from '../../domain/alarmFire';
import type { AlarmConfig } from '../../domain/types';
import { useT } from '../../i18n/useT';

const HOLD_MS = 1200;

/** Minutes from `now` until the next occurrence of an "HH:mm" alarm. */
function minutesUntil(hhmm: string, now: Date): number {
  const [h, m] = hhmm.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = (target.getTime() - now.getTime()) / 60000;
  if (diff < 0) diff += 24 * 60; // alarm is tomorrow morning
  return diff;
}

export function SessionScreen() {
  const t = useT();
  const active = useStore((s) => s.active);
  const endSession = useStore((s) => s.endSession);
  const cancelSession = useStore((s) => s.cancelSession);
  const alarms = useStore((s) => s.alarms);
  const smartAlarm = useStore((s) => s.settings.smartAlarm);
  const smartWindowMin = useStore((s) => s.settings.smartWindowMin);

  const [now, setNow] = useState(() => new Date());
  const [keepAwake, setKeepAwake] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [ringing, setRinging] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const holdStart = useRef<number | null>(null);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);

  // One motion recorder per session (lazy-initialised ref).
  const recorderRef = useRef<MotionRecorder | null>(null);
  if (recorderRef.current === null) recorderRef.current = new MotionRecorder();

  // One alarm player per session.
  const playerRef = useRef<AlarmPlayer | null>(null);
  if (playerRef.current === null) playerRef.current = new AlarmPlayer();

  // Latest inputs for the alarm-due check, read off the interval callback so
  // detection lives at the timer source rather than in a state-reacting effect.
  const dueInputs = useRef<{
    active: typeof active;
    alarm: AlarmConfig | null;
    snoozeUntil: number | null;
    ringing: boolean;
  } | null>(null);

  // End the session, handing the recorded movements to the store. `smart`
  // marks the wake as a smart-wake (light sleep detected before the alarm).
  const wake = useCallback(
    (smart = false) => {
      void notifySuccess();
      endSession(recorderRef.current?.stop(), smart);
    },
    [endSession],
  );

  // Live clock + recorded-movement count + alarm-due check, all off the timer.
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNow(d);
      setMoveCount(recorderRef.current?.current.length ?? 0);
      const s = dueInputs.current;
      if (s && !s.ringing && s.active && s.alarm) {
        const due =
          s.snoozeUntil != null
            ? d.getTime() >= s.snoozeUntil
            : isAlarmDue(s.alarm.time, s.active.startedAt, d);
        if (due) setRinging(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Record body movement for the duration of the session.
  useEffect(() => {
    const rec = recorderRef.current;
    let alive = true;
    void (async () => {
      await ensureMotionPermission();
      if (alive) void rec?.start();
    })();
    return () => {
      alive = false;
      rec?.stop();
    };
  }, []);

  // Keep-awake toggle side effect.
  useEffect(() => {
    if (keepAwake) void enableKeepAwake();
    else void disableKeepAwake();
    return () => {
      void disableKeepAwake();
    };
  }, [keepAwake]);

  const nextAlarmObj =
    alarms
      .filter((a) => a.enabled)
      .sort((a, b) => a.time.localeCompare(b.time))[0] ?? null;
  const nextAlarm = nextAlarmObj?.time;

  // Keep the interval's alarm-due inputs current. In-app alarm rings at the
  // set time (or when a snooze elapses) while this screen is foregrounded —
  // the loud, reliable wake that doesn't depend on the OS notification
  // surviving silent mode.
  useEffect(() => {
    dueInputs.current = { active, alarm: nextAlarmObj, snoozeUntil, ringing };
  }, [active, nextAlarmObj, snoozeUntil, ringing]);

  // Play / stop the tone as the ringing state flips.
  useEffect(() => {
    if (!ringing) return;
    const player = playerRef.current;
    player?.start(nextAlarmObj?.sound ?? DEFAULT_ALARM_SOUND);
    void enableKeepAwake();
    return () => player?.stop();
  }, [ringing, nextAlarmObj]);

  // Tear down the audio context when the session screen unmounts.
  useEffect(() => () => playerRef.current?.dispose(), []);

  const dismiss = () => {
    setRinging(false);
    wake();
  };
  const snooze = () => {
    setRinging(false);
    const min = nextAlarmObj?.snoozeMinutes ?? 5;
    setSnoozeUntil(Date.now() + min * 60000);
  };

  // Smart wake: each tick, check whether movement suggests light sleep inside
  // the window before the alarm. Only runs while this screen is foregrounded.
  useEffect(() => {
    if (!active || !smartAlarm || !nextAlarm) return;
    const elapsedMin =
      (now.getTime() - new Date(active.startedAt).getTime()) / 60000;
    const minutesToAlarm = minutesUntil(nextAlarm, now);
    if (
      shouldSmartWake({
        movements: recorderRef.current?.current ?? [],
        elapsedMin,
        minutesToAlarm,
        windowMin: smartWindowMin,
      })
    ) {
      wake(true);
    }
  }, [now, active, smartAlarm, nextAlarm, smartWindowMin, wake]);

  if (!active) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  // Drive the hold timer off the timestamp rAF hands the callback, so we
  // never read an impure clock during the render path.
  const tick = (ts: number) => {
    if (!holding.current) return;
    if (holdStart.current == null) holdStart.current = ts;
    const p = Math.min(1, (ts - holdStart.current) / HOLD_MS);
    setHoldProgress(p);
    if (p >= 1) {
      holding.current = false;
      wake();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    holding.current = true;
    holdStart.current = null;
    raf.current = requestAnimationFrame(tick);
  };
  const endHold = () => {
    holding.current = false;
    holdStart.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    setHoldProgress(0);
  };

  return (
    <div className="app-frame" style={{ background: 'var(--bg)' }}>
      <div className="session-wrap">
        <EyeMark size={56} color="var(--text)" open={false} />

        <div className="session-mid">
          <div className="session-clock num">
            {hh}
            <span style={{ opacity: 0.4 }}>:</span>
            {mm}
          </div>
          {nextAlarm && (
            <div className="session-alarm num">
              {t('session.alarm', { time: nextAlarm })}
              {smartAlarm && ` ${t('sep.middot')}${t('session.smartWake')}`}
            </div>
          )}
          <div className="session-alarm" style={{ opacity: 0.55 }}>
            {t('session.recording')}
            {moveCount > 0 ? ` ${t('sep.middot')}${moveCount}` : ''}
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div className="keep-awake-row">
            <span>{t('session.keepAwake')}</span>
            <Toggle on={keepAwake} onChange={setKeepAwake} label={t('session.keepAwake')} />
          </div>

          <button
            className="wake-btn"
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
          >
            <span
              className="wake-fill"
              style={{ transform: `scaleX(${holdProgress})` }}
            />
            <span style={{ position: 'relative' }}>{t('session.holdToWake')}</span>
          </button>

          <button className="back-btn" onClick={cancelSession}>
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {ringing && (
        <div className="alarm-ring">
          <EyeMark size={72} color="var(--mist)" open />
          <div className="alarm-ring-time num">
            {hh}:{mm}
          </div>
          <div className="alarm-ring-title">{t('session.wakeTime')}</div>
          <div className="alarm-ring-actions">
            <Button block large onClick={dismiss}>
              {t('session.dismiss')}
            </Button>
            {nextAlarmObj?.snoozeEnabled && (
              <button className="back-btn alarm-ring-snooze" onClick={snooze}>
                {t('session.snooze', { min: nextAlarmObj.snoozeMinutes })}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
