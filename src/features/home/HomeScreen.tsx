import type { CSSProperties } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { EyeMark } from '../../components/EyeMark';
import { lastSession, sleepDebtMin } from '../../domain/debt';
import { recommendedBedtime } from '../../domain/bedtime';
import { consistencyScore } from '../../domain/consistency';
import { thinkingCondition } from '../../domain/condition';
import { isoToHm } from '../../domain/format';
import { formatDate, formatDuration } from '../../i18n/catalog';
import { isQualityConfirmed } from '../../domain/score';
import { tapMedium } from '../../lib/haptics';
import { useT, useLang } from '../../i18n/useT';
import type { SleepSession } from '../../domain/types';

/* Last-7-nights skyline — the whole history at a glance, zero labels.
   Dashed hairline = goal; the most recent night is brightest. Tap → Log. */
function Skyline({
  sessions,
  goalMin,
}: {
  sessions: SleepSession[];
  goalMin: number;
}) {
  const W = 320;
  const H = 72;
  const recent = [...sessions]
    .sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))
    .slice(0, 7)
    .reverse();
  const max = Math.max(goalMin, ...recent.map((s) => s.durationMin), 1) * 1.06;
  const slot = W / 7;
  const barW = 20;
  const y = (v: number) => H * (1 - v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
      <line
        x1={0}
        x2={W}
        y1={y(goalMin)}
        y2={y(goalMin)}
        stroke="var(--accent)"
        strokeWidth={1}
        strokeDasharray="3 5"
        opacity={0.5}
      />
      {recent.map((s, i) => {
        // Right-align so tonight's empty slot never gaps the left edge.
        const cx = (7 - recent.length + i) * slot + slot / 2;
        const top = y(s.durationMin);
        const isLast = i === recent.length - 1;
        return (
          <rect
            key={s.id}
            className="sky-bar"
            style={{ '--i': i } as CSSProperties}
            x={cx - barW / 2}
            y={top}
            width={barW}
            height={H - top}
            rx={4}
            fill={isLast ? 'var(--accent)' : 'var(--primary)'}
            opacity={isLast ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}

export function HomeScreen({
  onOpenSettings,
  onGoAlarm,
  onGoLog,
  onStartNap,
  onWindDown,
}: {
  onOpenSettings: () => void;
  onGoAlarm: () => void;
  onGoLog: () => void;
  onStartNap: () => void;
  onWindDown: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);

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

  const plan = recommendedBedtime({
    wakeTime: settings.defaultWakeTime,
    targetMin: settings.targetDurationMin,
    debtMin: debt,
  });
  const reminderTime = settings.bedtimeReminder ? plan.bedtimeHm : undefined;

  // One sentence for last night: how long, and how it sat against the goal.
  const gap = last ? last.durationMin - settings.targetDurationMin : 0;
  const lastNightLine = !last
    ? t('home.noRecordsLine')
    : t(
        gap > 0
          ? 'home.lastNightOver'
          : gap < 0
            ? 'home.lastNightUnder'
            : 'home.lastNightExact',
        {
          dur: formatDuration(last.durationMin, lang),
          gap: formatDuration(Math.abs(gap), lang),
        },
      );

  return (
    <div className="screen">
      <div className="home-head">
        <div className="home-date">{formatDate(new Date(), lang)}</div>
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

      {/* The condition is the moon: a numbered moon in the sky, with the
          tier word standing beside it in vertical Japanese type. */}
      <div className="moon-block">
        <span className="kicker moon-kicker">{t('home.condKicker')}</span>
        <div className={`moon-word display cond-${condition.tier}`}>
          {t(`cond.${condition.tier}`)}
        </div>
        <div className="moon" aria-hidden="true">
          <span className={`moon-num num cond-${condition.tier}`}>
            {condition.index}
          </span>
        </div>
      </div>
      <p className="poster-line">{t(`cond.${condition.tier}Copy`)}</p>

      {/* The last 7 nights stand on the horizon and reflect in the water. */}
      <button
        className="horizon"
        aria-label={t('tab.history')}
        onClick={onGoLog}
      >
        <Skyline sessions={sessions} goalMin={settings.targetDurationMin} />
        <span className="horizon-line" aria-hidden="true" />
        <span className="horizon-reflection" aria-hidden="true">
          <Skyline sessions={sessions} goalMin={settings.targetDurationMin} />
        </span>
        <span className="skyline-caption">{lastNightLine}</span>
      </button>

      <div className="night-words">
        {last && !isQualityConfirmed(last) && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            {t('home.morningCheckPending', { time: isoToHm(last.endedAt) })}
          </span>
        )}
        {reminderTime && (
          <span className="bedtime-chip">
            ☾{' '}
            {plan.recoveryMin > 0
              ? t('home.bedtimeRecoveryLine', {
                  time: reminderTime,
                  amount: formatDuration(plan.recoveryMin, lang),
                })
              : t('home.bedtimeLine', { time: reminderTime })}
          </span>
        )}
      </div>

      {/* Good night: a violet moon rising out of the bottom edge, with the
          nap and alarm orbiting it as two small satellites. */}
      <div className="night-foot">
        <button
          className="quick-orb"
          aria-label={t('nap.title')}
          onClick={onStartNap}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 3.5a8.5 8.5 0 1 0 8 11.5 7 7 0 0 1-8-11.5z" />
          </svg>
        </button>
        <button
          className="moon-dome"
          onClick={() => {
            void tapMedium();
            onWindDown();
          }}
        >
          {/* the wrapper carries the tag that lets reduced motion and the
              sleep theme switch the blink off at the root */}
          <span className="eye-blink" data-ambient>
            <EyeMark size={40} color="var(--plane-fg)" />
          </span>
          {t('home.cta')}
        </button>
        <button
          className="quick-orb"
          aria-label={t('tab.alarm')}
          onClick={onGoAlarm}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4.5a5 5 0 0 0-5 5c0 2.9-.7 4.4-1.7 5.6-.35.42-.05 1.4.55 1.4h12.3c.6 0 .9-.98.55-1.4-1-1.2-1.7-2.7-1.7-5.6a5 5 0 0 0-5-5z" />
            <path d="M10.3 19.5a1.8 1.8 0 0 0 3.4 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}
