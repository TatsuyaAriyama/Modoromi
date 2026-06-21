import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { TimeDial } from '../../components/TimeDial';
import { subtractMinutesHm } from '../../domain/format';
import type { Lang } from '../../domain/types';
import { LANGS, formatDuration } from '../../i18n/catalog';
import { useT, useLang } from '../../i18n/useT';
import { ensurePermission } from '../../lib/notifications';
import { isNative } from '../../lib/platform';
import { tapMedium } from '../../lib/haptics';

const DURATION_OPTIONS = [360, 390, 420, 450, 480, 510, 540];
const STEPS = 3;

export function OnboardingScreen() {
  const t = useT();
  const lang = useLang();
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
              <p className="onb-sub">{t('onb.tagline')}</p>
              <p className="onb-copy">{t('onb.intro')}</p>
              <div
                className="seg"
                style={{ marginTop: 18, alignSelf: 'center' }}
                role="group"
                aria-label={t('lang.title')}
              >
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    data-on={lang === l.id}
                    aria-pressed={lang === l.id}
                    onClick={() =>
                      void saveSettings({ ...settings, lang: l.id as Lang })
                    }
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="onb-title" style={{ fontSize: 24 }}>
                {t('onb.goalTitle')}
              </h1>
              <div className="onb-card">
                <div className="field">
                  <label style={{ color: 'var(--mist)', opacity: 0.85 }}>
                    {t('onb.targetLabel')}
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
                        {formatDuration(m, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label style={{ color: 'var(--mist)', opacity: 0.85 }}>
                    {t('onb.wakeLabel')}
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TimeDial value={wake} onChange={setWake} minuteStep={5} />
                  </div>
                </div>
              </div>
              <p className="onb-copy">
                {t('onb.bedtimeHint', { time: bedtime })}
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="onb-title" style={{ fontSize: 24 }}>
                {t('onb.permTitle')}
              </h1>
              <p className="onb-copy">
                {t('onb.permBody')}
                {isNative() ? '' : t('onb.permWeb')}
              </p>
              <p className="onb-copy" style={{ opacity: 0.7, fontSize: 12.5 }}>
                {t('onb.permDisclaimer')}
              </p>
              {permState === 'granted' && (
                <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--mist)' }}>
                  {t('onb.permGranted')}
                </span>
              )}
              {permState === 'denied' && (
                <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--mist)' }}>
                  {t('onb.permDenied')}
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
              {step === 0 ? t('common.start') : t('common.next')}
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
                {permState === 'idle'
                  ? t('onb.allowNotif')
                  : t('onb.finishWithReminder')}
              </button>
              <button
                className="btn btn-onb-ghost btn-block"
                onClick={() => void finish(false)}
              >
                {t('onb.skipNotif')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
