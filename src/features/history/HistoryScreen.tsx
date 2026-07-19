import { useMemo, useState, type CSSProperties } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { SessionDetail } from './SessionDetail';
import { ShareSheet } from '../share/ShareSheet';
import {
  averageDuration,
  averageQuality,
  buildDaySeries,
} from '../../domain/history';
import {
  consistencyScore,
  regularityLevel,
} from '../../domain/consistency';
import { weeklyReview } from '../../domain/review';
import { deriveInsights } from '../../domain/insights';
import { formatDuration } from '../../i18n/catalog';
import { weekdayName } from '../../domain/format';
import type { Lang, SleepSession } from '../../domain/types';
import { useClock, useT, useLang } from '../../i18n/useT';
import { formatIsoTime, type Clock } from '../../i18n/clock';

type Range = 'week' | 'month';

/** Mirrors the nth-child stagger cap in src/index.css. */
const STAGGER_CAP = 7;

/* ── The night river ────────────────────────────────────────────
   Each night floats at its true clock position: a band from bed
   to wake on a 19:00 → 12:00 axis, newest at the top. Bedtime
   drift becomes a visible wiggle; quality becomes brightness. */

const AXIS_START = 19 * 60; // 19:00
const AXIS_SPAN = 17 * 60; // → 12:00 next day

function riverX(iso: string): number {
  const d = new Date(iso);
  const min = (d.getHours() * 60 + d.getMinutes() - AXIS_START + 1440) % 1440;
  return Math.min(Math.max(min / AXIS_SPAN, 0), 1);
}

function NightRiver({
  nights,
  lang,
  clock,
  t,
  onPick,
}: {
  nights: SleepSession[];
  lang: Lang;
  clock: Clock;
  t: (key: string, params?: Record<string, string | number>) => string;
  onPick: (s: SleepSession) => void;
}) {
  return (
    <div className="river" role="group" aria-label={t('history.nightsAria')}>
      <div className="river-axis num" aria-hidden="true">
        {[21, 0, 3, 6, 9].map((h) => (
          <span
            key={h}
            className="river-hour"
            style={{ left: `${(((h * 60 - AXIS_START + 1440) % 1440) / AXIS_SPAN) * 100}%` }}
          >
            {h}
          </span>
        ))}
      </div>
      {nights.map((s, i) => {
        const x0 = riverX(s.startedAt);
        const x1 = riverX(s.endedAt);
        const q = s.qualityScore;
        return (
          <button
            key={s.id}
            className="river-row"
            style={{ '--i': Math.min(i, STAGGER_CAP) } as CSSProperties}
            /* aria-label IS right here (unlike the alarm row): the name has to
               interleave day, times, duration and score, which the visible
               fragments cannot do on their own. Drift and outliers are NOT
               repeated per row — that is the shape of the whole block, and the
               screen already states it in the headline and the insights. */
            aria-label={t(
              q != null ? 'history.nightAria' : 'history.nightAriaNoScore',
              {
                day: weekdayName(new Date(s.endedAt).getDay(), lang),
                start: formatIsoTime(s.startedAt, clock),
                end: formatIsoTime(s.endedAt, clock),
                dur: formatDuration(s.durationMin, lang),
                ...(q != null ? { q } : {}),
              },
            )}
            onClick={() => onPick(s)}
          >
            <span className="river-day">
              {weekdayName(new Date(s.endedAt).getDay(), lang)}
            </span>
            <span className="river-lane">
              <span
                className="river-night"
                style={
                  {
                    left: `${x0 * 100}%`,
                    width: `${Math.max((x1 - x0) * 100, 2)}%`,
                    // quality rides --q so the pour keyframe can own opacity
                    '--q': q != null ? 0.3 + 0.7 * (q / 100) : 0.35,
                  } as CSSProperties
                }
              />
            </span>
            <span className="river-score num">{q ?? '—'}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── The constellation ──────────────────────────────────────────
   Quality over time as stars, joined by a faint thread. */

function Constellation({
  points,
  label,
}: {
  points: { label: string; value: number | null }[];
  /** The one fact the shape carries that no text on this screen does: the
      spread. Direction is in the review headline and the centre is the
      Avg. quality stat, so neither is repeated here. */
  label: string | null;
}) {
  const W = 320;
  const H = 96;
  const padX = 10;
  const padY = 12;
  const n = Math.max(points.length, 1);
  const x = (i: number) =>
    padX + (n === 1 ? (W - padX * 2) / 2 : ((W - padX * 2) * i) / (n - 1));
  const y = (v: number) => padY + (H - padY * 2) * (1 - v / 100);
  const stars = points
    .map((p, i) => (p.value == null ? null : { x: x(i), y: y(p.value), i }))
    .filter((p): p is { x: number; y: number; i: number } => p !== null);
  const thread = stars
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const })}
    >
      {thread && <path d={thread} pathLength={1} className="const-thread" />}
      {stars.map((p, k) => (
        <g
          key={p.i}
          className="const-node"
          style={
            {
              '--s': stars.length > 1 ? k / (stars.length - 1) : 0,
            } as CSSProperties
          }
        >
          <circle cx={p.x} cy={p.y} r={2} className="const-star" />
          {/* every third star gets a sparkle cross */}
          {p.i % 3 === 0 && (
            <path
              d={`M ${p.x - 5} ${p.y} H ${p.x + 5} M ${p.x} ${p.y - 5} V ${p.y + 5}`}
              className="const-sparkle"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

export function HistoryScreen() {
  const t = useT();
  const lang = useLang();
  const clock = useClock();
  const sessions = useStore((s) => s.sessions);
  const targetMin = useStore((s) => s.settings.targetDurationMin);
  const [range, setRange] = useState<Range>('week');
  const [selected, setSelected] = useState<SleepSession | null>(null);
  const [sharing, setSharing] = useState<SleepSession | null>(null);

  const days = range === 'week' ? 7 : 30;
  const series = useMemo(
    () => buildDaySeries(sessions, days, new Date(), lang),
    [sessions, days, lang],
  );
  const avgDur = averageDuration(series);
  const avgQ = averageQuality(series);
  const consistency = useMemo(
    () => consistencyScore(sessions, days),
    [sessions, days],
  );
  const review = useMemo(
    () => weeklyReview(sessions, targetMin),
    [sessions, targetMin],
  );
  const insights = useMemo(
    () => deriveInsights(sessions, targetMin),
    [sessions, targetMin],
  );

  // Only worth speaking once there is a spread to speak of.
  const scores = series
    .map((s) => s.qualityScore)
    .filter((v): v is number => v != null);
  const spreadLabel =
    scores.length >= 2
      ? t('chart.qualityRangeAria', {
          n: scores.length,
          min: Math.min(...scores),
          max: Math.max(...scores),
        })
      : null;

  const nights = useMemo(
    () =>
      [...sessions]
        .sort(
          (a, b) =>
            new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
        )
        .slice(0, days),
    [sessions, days],
  );

  return (
    <div className="screen">
      <div className="spread">
        <h1 className="screen-title">{t('tab.history')}</h1>
        <div className="seg" role="group" aria-label={t('history.rangeAria')}>
          <button
            data-on={range === 'week'}
            aria-pressed={range === 'week'}
            onClick={() => setRange('week')}
          >
            {t('history.week')}
          </button>
          <button
            data-on={range === 'month'}
            aria-pressed={range === 'month'}
            onClick={() => setRange('month')}
          >
            {t('history.month')}
          </button>
        </div>
      </div>

      {nights.length === 0 ? (
        <p className="empty">{t('history.empty')}</p>
      ) : (
        <>
          {/* the week, as one written sentence */}
          <p className="review-headline display">
            {review.headlineParts.map((p) => t(`review.${p}`)).join(t('sep.middot'))}
          </p>

          {/* three numbers, no boxes */}
          <div className="summary-row">
            <div className="stat">
              <span className="stat-label">{t('history.avgDuration')}</span>
              <span className="stat-val num" style={{ color: 'var(--numeral)' }}>
                {avgDur > 0 ? formatDuration(avgDur, lang) : '—'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">{t('history.avgQuality')}</span>
              <span className="stat-val num" style={{ color: 'var(--numeral)' }}>
                {avgQ ?? '—'}
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

          {/* each night, floating at its true clock position */}
          {/* keyed by range so a week⇄month switch re-pours as one cascade
              instead of leaving the seven shared rows standing still */}
          <NightRiver
            key={range}
            nights={nights}
            lang={lang}
            clock={clock}
            t={t}
            onPick={setSelected}
          />

          {/* quality, drawn as a constellation */}
          <div>
            <span className="kicker">{t('chart.qualityTrend')}</span>
            <Constellation
              key={range}
              label={spreadLabel}
              points={series.map((s) => ({
                label: s.label,
                value: s.qualityScore,
              }))}
            />
          </div>

          {insights.length > 0 && (
            <ul className="insight-list">
              {insights.map((i) => (
                <li key={i.id} className="insight-item">
                  {t(`insight.${i.id}`, i.params)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected && (
        <SessionDetail
          session={selected}
          onShare={(s) => {
            setSelected(null);
            setSharing(s);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {sharing && (
        <ShareSheet session={sharing} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}
