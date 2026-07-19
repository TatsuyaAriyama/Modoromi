import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { NightSky } from '../../components/NightSky';
import { Toggle } from '../../components/Toggle';
import { Button } from '../../components/Button';
import { disableKeepAwake, enableKeepAwake } from '../../lib/keepAwake';
import { notifySuccess } from '../../lib/haptics';
import { MotionRecorder, ensureMotionPermission } from '../../lib/motion';
import { AlarmPlayer, DEFAULT_ALARM_SOUND } from '../../lib/alarmSound';
import { shouldSmartWake } from '../../domain/motion';
import { nextAlarmFor } from '../../domain/alarmFire';
import type { AlarmConfig } from '../../domain/types';
import { cancelSnooze, scheduleSnooze } from '../../lib/notifications';
import { useClock, useLang, useT } from '../../i18n/useT';
import { formatHm, hmParts } from '../../i18n/clock';

const HOLD_MS = 1200;

export function SessionScreen() {
  const t = useT();
  const lang = useLang();
  const clock = useClock();
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
  const [confirmWake, setConfirmWake] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
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
    at: number | null;
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
            : s.at != null && d.getTime() >= s.at;
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

  // The alarm that will actually ring for THIS night — resolved from the
  // session start and each alarm's repeat days, not from the earliest clock
  // string. `alarm` is an element of `alarms`, so its identity is stable
  // across the 1s ticks and the tone effect below never restarts.
  const startedAt = active?.startedAt;
  const next = useMemo(
    () => (startedAt ? nextAlarmFor(alarms, new Date(startedAt)) : null),
    [alarms, startedAt],
  );
  const nextAlarmObj = next?.alarm ?? null;
  const nextAlarmAt = next?.at ?? null;
  const nextAlarm = nextAlarmObj?.time;

  // Keep the interval's alarm-due inputs current. In-app alarm rings at the
  // set time (or when a snooze elapses) while this screen is foregrounded —
  // the loud, reliable wake that doesn't depend on the OS notification
  // surviving silent mode.
  useEffect(() => {
    dueInputs.current = {
      active,
      alarm: nextAlarmObj,
      at: nextAlarmAt,
      snoozeUntil,
      ringing,
    };
  }, [active, nextAlarmObj, nextAlarmAt, snoozeUntil, ringing]);

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

  // Never leave the hold's rAF running after an interrupted touch or unmount.
  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  // Move focus into the ring when the alarm fires. role="alertdialog" plus the
  // focus move is what announces it to a screen reader; it also collapses any
  // half-open confirmation behind the ring.
  useEffect(() => {
    if (!ringing) return;
    ringRef.current?.querySelector('button')?.focus();
  }, [ringing]);

  const dismiss = () => {
    void cancelSnooze();
    setRinging(false);
    wake();
  };
  const snooze = () => {
    setRinging(false);
    const min = nextAlarmObj?.snoozeMinutes ?? 5;
    setSnoozeUntil(Date.now() + min * 60000);
    // OS backstop: the in-app timer above dies the moment the screen locks.
    void scheduleSnooze(min, lang);
  };

  // Covers every other way out of a session — hold-to-wake, smart wake and
  // Cancel — none of which go through dismiss().
  useEffect(
    () => () => {
      void cancelSnooze();
    },
    [],
  );

  // Smart wake: each tick, check whether movement suggests light sleep inside
  // the window before the alarm. Only runs while this screen is foregrounded.
  useEffect(() => {
    if (!active || !smartAlarm || nextAlarmAt == null) return;
    const elapsedMin =
      (now.getTime() - new Date(active.startedAt).getTime()) / 60000;
    const minutesToAlarm = (nextAlarmAt - now.getTime()) / 60000;
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
  }, [now, active, smartAlarm, nextAlarmAt, smartWindowMin, wake]);

  if (!active) return null;

  // The 80px clock renders its period as a small superscript rather than
  // inline: " PM" at full size would overflow a 375px screen.
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
  const parts = hmParts(nowHm, clock);
  const [hh, mm] = parts.digits.split(':');

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
      <NightSky />
      <div
        className="session-wrap"
        inert={ringing ? true : undefined}
        aria-hidden={ringing || undefined}
      >
        <EyeMark size={56} color="var(--text)" open={false} />

        <div className="session-mid">
          <div className="session-clock num">
            {parts.period && parts.periodFirst && (
              <span className="clock-period">{parts.period}</span>
            )}
            {hh}
            <span style={{ opacity: 0.4 }}>:</span>
            {mm}
            {parts.period && !parts.periodFirst && (
              <span className="clock-period">{parts.period}</span>
            )}
          </div>
          {nextAlarm && (
            <div className="session-alarm num">
              {t('session.alarm', { time: formatHm(nextAlarm, clock) })}
              {smartAlarm && ` ${t('sep.middot')}${t('session.smartWake')}`}
            </div>
          )}
          <div className="session-alarm">
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
            data-holding={holdProgress > 0}
            aria-describedby="wake-hint"
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onTouchCancel={endHold}
            onPointerCancel={endHold}
            onBlur={endHold}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                startHold();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') endHold();
            }}
          >
            <span
              className="wake-fill"
              aria-hidden="true"
              style={{ transform: `scaleX(${holdProgress})` }}
            />
            <span style={{ position: 'relative' }}>{t('session.holdToWake')}</span>
          </button>
          <p
            id="wake-hint"
            className="muted"
            style={{ fontSize: 13, textAlign: 'center' }}
          >
            {t('session.holdHint')}
          </p>

          {/* A single-tap escape hatch with no timing requirement. Its own
              control rather than a click handler on the hold button, so a
              stray tap while asleep still does nothing. Collapsed while the
              alarm rings — the ring owns the screen then. */}
          {confirmWake && !ringing ? (
            <div className="alarm-ring-actions">
              <span className="muted">{t('session.confirmWake')}</span>
              <Button block onClick={() => wake()}>
                {t('session.confirmWakeYes')}
              </Button>
              <button className="back-btn" onClick={() => setConfirmWake(false)}>
                {t('common.cancel.soft')}
              </button>
            </div>
          ) : (
            <button className="back-btn" onClick={() => setConfirmWake(true)}>
              {t('session.endNow')}
            </button>
          )}

          <button className="back-btn" onClick={cancelSession}>
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {ringing && (
        <div
          className="alarm-ring"
          ref={ringRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alarm-ring-title"
        >
          <EyeMark size={72} color="var(--mist)" open />
          <div className="alarm-ring-time num">
            {formatHm(nowHm, clock)}
          </div>
          <div className="alarm-ring-title" id="alarm-ring-title">
            {t('session.wakeTime')}
          </div>
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
