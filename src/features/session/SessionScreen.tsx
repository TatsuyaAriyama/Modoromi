import { useEffect, useRef, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { Toggle } from '../../components/Toggle';
import { disableKeepAwake, enableKeepAwake } from '../../lib/keepAwake';
import { notifySuccess } from '../../lib/haptics';

const HOLD_MS = 1200;

export function SessionScreen() {
  const active = useStore((s) => s.active);
  const endSession = useStore((s) => s.endSession);
  const cancelSession = useStore((s) => s.cancelSession);
  const alarms = useStore((s) => s.alarms);

  const [now, setNow] = useState(() => new Date());
  const [keepAwake, setKeepAwake] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);

  // Live clock.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep-awake toggle side effect.
  useEffect(() => {
    if (keepAwake) void enableKeepAwake();
    else void disableKeepAwake();
    return () => {
      void disableKeepAwake();
    };
  }, [keepAwake]);

  if (!active) return null;

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .map((a) => a.time)
    .sort()[0];

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
      void notifySuccess();
      endSession();
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
            <div className="session-alarm num">アラーム {nextAlarm}</div>
          )}
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
