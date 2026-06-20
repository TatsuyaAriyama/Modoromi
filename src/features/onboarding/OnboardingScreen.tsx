import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { TimeDial } from '../../components/TimeDial';
import { formatDurationJa, subtractMinutesHm } from '../../domain/format';
import { ensurePermission } from '../../lib/notifications';
import { isNative } from '../../lib/platform';
import { tapMedium } from '../../lib/haptics';

const DURATION_OPTIONS = [360, 390, 420, 450, 480, 510, 540];
const STEPS = 3;

export function OnboardingScreen() {
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);

  const [step, setStep] = useState(0);
  const [targetMin, setTargetMin] = useState(settings.targetDurationMin);
  const [wake, setWake] = useState(settings.defaultWakeTime);
  const [permState, setPermState] = useState<'idle' | 'granted' | 'denied'>(
    'idle',
  );

  const bedtime = subtractMinutesHm(wake, targetMin);

  const finish = async (bedtimeReminder: boolean) => {
    await saveSettings({
      ...settings,
      targetDurationMin: targetMin,
      defaultWakeTime: wake,
      bedtimeReminder,
      onboarded: true,
    });
  };

  const requestPerms = async () => {
    const ok = await ensurePermission();
    setPermState(ok ? 'granted' : 'denied');
  };

  return (
    <div className="onb">
      <div className="onb-inner">
        <div className="onb-body">
          {step === 0 && (
            <>
              <EyeMark size={84} color="var(--mist)" />
              <h1 className="onb-title">Madoromi</h1>
              <p className="onb-sub">思考のための睡眠を設計する</p>
              <p className="onb-copy">
                睡眠を記録するだけでなく、設計する。
                就寝・起床・質を可視化し、目標とのズレを翌日の思考コンディションとして静かに見せます。
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="onb-title" style={{ fontSize: 24 }}>
                目標を決めましょう
              </h1>
              <div className="onb-card">
                <div className="field">
                  <label style={{ color: 'var(--mist)', opacity: 0.85 }}>
                    目標睡眠時間
                  </label>
                  <select
                    className="select"
                    value={targetMin}
                    onChange={(e) => setTargetMin(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.16)',
                      color: 'var(--mist)',
                      borderColor: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {DURATION_OPTIONS.map((m) => (
                      <option key={m} value={m} style={{ color: '#211c2e' }}>
                        {formatDurationJa(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label style={{ color: 'var(--mist)', opacity: 0.85 }}>
                    起床時刻
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TimeDial value={wake} onChange={setWake} minuteStep={5} />
                  </div>
                </div>
              </div>
              <p className="onb-copy">
                逆算した就寝の目安は <strong className="num">{bedtime}</strong> 頃です。
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="onb-title" style={{ fontSize: 24 }}>
                通知の許可
              </h1>
              <p className="onb-copy">
                起床アラームと就寝リマインダーをお届けするために通知を使います。
                {isNative()
                  ? ''
                  : '（ブラウザでは通知は発火しません。実機でご確認ください）'}
              </p>
              <p className="onb-copy" style={{ opacity: 0.7, fontSize: 12.5 }}>
                ※ iOS ではロック中・サイレント・集中モードの影響を受けるため、
                確実に大音量で鳴る目覚ましは保証されません。あくまで通知ベースの目安です。
              </p>
              {permState === 'granted' && (
                <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--mist)' }}>
                  通知を許可しました
                </span>
              )}
              {permState === 'denied' && (
                <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--mist)' }}>
                  あとで設定から変更できます
                </span>
              )}
            </>
          )}
        </div>

        <div className="onb-foot">
          <div className="onb-dots" aria-hidden="true">
            {Array.from({ length: STEPS }).map((_, i) => (
              <span key={i} className="onb-dot" data-on={i === step} />
            ))}
          </div>

          {step < 2 ? (
            <button
              className="btn btn-onb btn-block btn-lg"
              onClick={() => {
                void tapMedium();
                setStep((s) => s + 1);
              }}
            >
              {step === 0 ? 'はじめる' : '次へ'}
            </button>
          ) : (
            <>
              <button
                className="btn btn-onb btn-block btn-lg"
                onClick={() => {
                  if (permState === 'idle') void requestPerms();
                  else void finish(true);
                }}
              >
                {permState === 'idle' ? '通知を許可' : '就寝リマインダーをON にして始める'}
              </button>
              <button
                className="btn btn-onb-ghost btn-block"
                onClick={() => void finish(false)}
              >
                あとで・通知なしで始める
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
