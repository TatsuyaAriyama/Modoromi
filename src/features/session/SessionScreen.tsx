import { useCallback, useEffect, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { Toggle } from '../../components/Toggle';
import { disableKeepAwake, enableKeepAwake } from '../../lib/keepAwake';
import { notifySuccess } from '../../lib/haptics';
import { MotionRecorder, ensureMotionPermission } from '../../lib/motion';
import { shouldSmartWake } from '../../domain/motion';

const HOLD_MS = 1200;
/** Smart-wake looks for light sleep within this many minutes before the alarm. */
const SMART_WINDOW_MIN = 30;

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
  const active = useStore((s) => s.active);
  const endSession = useStore((s) => s.endSession);
  const cancelSession = useStore((s) => s.cancelSession);
  const alarms = useStore((s) => s.alarms);
  const smartAlarm = useStore((s) => s.settings.smartAlarm);

  const [now, setNow] = useState(() => new Date());
  const [keepAwake, setKeepAwake] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const holdStart = useRef<number | null>(null);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);

  // One motion recorder per session (lazy-initialised ref).
  const recorderRef = useRef<MotionRecorder | null>(null);
  if (recorderRef.current === null) recorderRef.current = new MotionRecorder();

  // End the session, handing the recorded movements to the store.
  const wake = useCallback(() => {
    void notifySuccess();
    endSession(recorderRef.current?.stop());
  }, [endSession]);

  // Live clock + recorded-movement count (read the ref off the render path).
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setMoveCount(recorderRef.current?.current.length ?? 0);
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

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .map((a) => a.time)
    .sort()[0];

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
        windowMin: SMART_WINDOW_MIN,
      })
    ) {
      wake();
    }
  }, [now, active, smartAlarm, nextAlarm, wake]);

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
              アラーム {nextAlarm}
              {smartAlarm && ' ・ スマート起床'}
            </div>
          )}
          <div className="session-alarm" style={{ opacity: 0.55 }}>
            体動を記録中{moveCount > 0 ? ` ・ ${moveCount}回` : ''}
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div className="keep-awake-row">
            <span>画面を点けたままにする</span>
            <Toggle on={keepAwake} onChange={setKeepAwake} label="画面を点けたままにする" />
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
            <span style={{ position: 'relative' }}>長押しで「起きた」</span>
          </button>

          <button className="back-btn" onClick={cancelSession}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
