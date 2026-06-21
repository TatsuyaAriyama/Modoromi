import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { EyeMark } from '../../components/EyeMark';
import { lastSession, sleepDebtMin } from '../../domain/debt';
import { recommendedBedtime } from '../../domain/bedtime';
import { hygieneCues } from '../../domain/hygiene';
import {
  consistencyScore,
  regularityLevel,
} from '../../domain/consistency';
import { thinkingCondition } from '../../domain/condition';
import { todaysTheme } from '../../domain/theme';
import { isoToHm } from '../../domain/format';
import { formatDate, formatDuration } from '../../i18n/catalog';
import { isQualityConfirmed } from '../../domain/score';
import { tapMedium } from '../../lib/haptics';
import { useT, useLang } from '../../i18n/useT';

export function HomeScreen({
  onOpenSettings,
  onGoAlarm,
  onStartNap,
  onWindDown,
  onSharpness,
}: {
  onOpenSettings: () => void;
  onGoAlarm: () => void;
  onStartNap: () => void;
  onWindDown: () => void;
  onSharpness: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const alarms = useStore((s) => s.alarms);

  const last = lastSession(sessions);
  const debt = sleepDebtMin(sessions, settings.targetDurationMin);
  const consistency = consistencyScore(sessions);
  const lastQuality =
    last && isQualityConfirmed(last) ? (last.qualityScore ?? null) : null;
  const condition = thinkingCondition({
    lastQuality,
    debtMin: debt,
    consistency,
  });

  const theme = todaysTheme(sessions);

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .map((a) => a.time)
    .sort()[0];
  const plan = recommendedBedtime({
    wakeTime: settings.defaultWakeTime,
    targetMin: settings.targetDurationMin,
    debtMin: debt,
  });
  const reminderTime = settings.bedtimeReminder ? plan.bedtimeHm : undefined;
  const cues = hygieneCues(plan.bedtimeHm);

  return (
    <div className="screen">
      <div className="home-head">
        <div>
          <div className="home-date">{formatDate(new Date(), lang)}</div>
          <h1 className="home-greeting">{t('home.greeting')}</h1>
        </div>
        <button
          className="icon-btn"
          aria-label={t('settings.title')}
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {theme && (
        <div className="theme-banner">
          <span className="theme-label">{t('home.theme')}</span>
          <span className="theme-text">{theme}</span>
        </div>
      )}

      {/* Last night summary */}
      <Card>
        <div className="stat-label">{t('home.lastNight')}</div>
        {last ? (
          <>
            <div className="summary-big num">
              {formatDuration(last.durationMin, lang)}
            </div>
            <div className="summary-row">
              <div className="stat">
                <span className="stat-label">{t('home.vsTarget')}</span>
                <span className="stat-val num">
                  {formatDuration(
                    last.durationMin - settings.targetDurationMin,
                    lang,
                  )}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">{t('home.quality')}</span>
                <span className="stat-val num">
                  {isQualityConfirmed(last) ? last.qualityScore : '—'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            {t('home.noRecords')}
          </p>
        )}
      </Card>

      {/* Thinking condition (synthesises quality, debt, regularity) */}
      <Card tight>
        <div className="spread">
          <div className="stat-label">{t('home.condition')}</div>
          <EyeMark size={36} color="var(--text-mute)" />
        </div>
        <div className={`cond-headline cond-${condition.tier}`}>
          {t(`cond.${condition.tier}`)}
          <span className="cond-index num">{condition.index}</span>
        </div>
        <p className={`muted cond-${condition.tier}`} style={{ fontSize: 13 }}>
          {t(`cond.${condition.tier}Copy`)}
        </p>
        <div className="summary-row" style={{ marginTop: 10 }}>
          <div className="stat">
            <span className="stat-label">{t('home.debt7')}</span>
            <span className="stat-val num">
              {debt > 0
                ? `-${formatDuration(debt, lang)}`
                : formatDuration(0, lang)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('stat.regularity')}</span>
            <span className="stat-val">
              {consistency == null
                ? '—'
                : t(`reg.${regularityLevel(consistency)}`)}
            </span>
          </div>
        </div>
      </Card>

      {/* Tonight's gentle hygiene cues — a quiet 目安, derived from bedtime */}
      <Card tight>
        <div className="stat-label" style={{ marginBottom: 8 }}>
          {t('home.tonightCues')}
        </div>
        <div className="cue-row">
          <span className="cue-text">{t('home.caffeineCue')}</span>
          <span className="cue-time num">{`–${cues.caffeineCutoffHm}`}</span>
        </div>
        <div className="cue-row">
          <span className="cue-text">{t('home.screenWarmCue')}</span>
          <span className="cue-time num">{`${cues.screenWarmHm}–`}</span>
        </div>
      </Card>

      {/* Primary CTA */}
      <div className="cta-wrap">
        {reminderTime && (
          <span className="pill">
            {plan.recoveryMin > 0
              ? t('home.suggestedBedtime')
              : t('home.bedtimeReminder')}{' '}
            {reminderTime}
          </span>
        )}
        {reminderTime && plan.recoveryMin > 0 && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            {t('home.earlierBy', {
              amount: formatDuration(plan.recoveryMin, lang),
            })}
          </span>
        )}
        {last && !isQualityConfirmed(last) && (
          <span className="muted" style={{ fontSize: 13 }}>
            {t('home.morningCheckPending', { time: isoToHm(last.endedAt) })}
          </span>
        )}
        <button
          className="cta-hero"
          onClick={() => {
            void tapMedium();
            onWindDown();
          }}
        >
          <EyeMark size={40} color="var(--mist)" />
          {t('home.cta')}
        </button>
        <div className="cta-links">
          {!nextAlarm && (
            <button className="back-btn" onClick={onGoAlarm}>
              {t('home.setAlarm')}
            </button>
          )}
          <button className="back-btn" onClick={onStartNap}>
            {t('home.nap')}
          </button>
          <button className="back-btn" onClick={onSharpness}>
            {t('home.sharpness')}
          </button>
        </div>
      </div>
    </div>
  );
}
