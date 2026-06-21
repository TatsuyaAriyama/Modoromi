import { useMemo, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { BarChart } from '../../components/BarChart';
import { LineChart } from '../../components/LineChart';
import { SessionDetail } from './SessionDetail';
import {
  averageDuration,
  averageQuality,
  buildDaySeries,
} from '../../domain/history';
import {
  consistencyScore,
  regularityLevel,
} from '../../domain/consistency';
import { buildConditionSeries } from '../../domain/conditionSeries';
import { weeklyReview } from '../../domain/review';
import { deriveInsights } from '../../domain/insights';
import { themeLog } from '../../domain/themeLog';
import {
  buildSharpnessSeries,
  latestResult,
  sharpnessAgreement,
  sharpnessTier,
} from '../../domain/sharpness';
import { isoToHm } from '../../domain/format';
import { formatDate, formatDuration } from '../../i18n/catalog';
import type { SleepSession } from '../../domain/types';
import { useT, useLang } from '../../i18n/useT';

type Range = 'week' | 'month';

export function HistoryScreen() {
  const t = useT();
  const lang = useLang();
  const sessions = useStore((s) => s.sessions);
  const sharpness = useStore((s) => s.sharpness);
  const targetMin = useStore((s) => s.settings.targetDurationMin);
  const [range, setRange] = useState<Range>('week');
  const [selected, setSelected] = useState<SleepSession | null>(null);

  const days = range === 'week' ? 7 : 30;
  const series = useMemo(
    () => buildDaySeries(sessions, days, new Date(), lang),
    [sessions, days, lang],
  );
  const conditionSeries = useMemo(
    () => buildConditionSeries(sessions, targetMin, days, new Date(), lang),
    [sessions, targetMin, days, lang],
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
  const themes = useMemo(() => themeLog(sessions), [sessions]);
  const sharpSeries = useMemo(
    () => buildSharpnessSeries(sharpness, days, new Date(), lang),
    [sharpness, days, lang],
  );
  const latestSharp = useMemo(() => latestResult(sharpness), [sharpness]);
  const agreement = useMemo(
    () => sharpnessAgreement(sharpness, conditionSeries),
    [sharpness, conditionSeries],
  );

  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
      ),
    [sessions],
  );

  return (
    <div className="screen">
      <div className="spread">
        <h1 className="screen-title">{t('tab.history')}</h1>
        <div className="seg" role="group" aria-label={t('tab.history')}>
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

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 6 }}>
          {t('history.weeklyReview')}
        </div>
        <p className="review-headline">
          {review.headlineParts.map((p) => t(`review.${p}`)).join(t('sep.middot'))}
        </p>
        {review.loggedNights > 0 && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            {t('history.logged', { nights: review.loggedNights })}
            {review.qualityDeltaVsPrev != null &&
              t('history.vsPrev', {
                delta: `${review.qualityDeltaVsPrev > 0 ? '+' : ''}${review.qualityDeltaVsPrev}`,
              })}
          </span>
        )}
      </Card>

      {insights.length > 0 && (
        <Card tight>
          <div className="stat-label" style={{ marginBottom: 6 }}>
            {t('history.insights')}
          </div>
          <ul className="insight-list">
            {insights.map((i) => (
              <li key={i.id} className="insight-item">
                {t(`insight.${i.id}`, i.params)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {themes.length > 0 && (
        <Card tight>
          <div className="stat-label" style={{ marginBottom: 6 }}>
            {t('history.themes')}
          </div>
          <ul className="theme-log">
            {themes.map((e) => (
              <li key={e.id} className="theme-log-item">
                <div className="theme-log-text">{e.theme}</div>
                <div className="theme-log-meta">
                  <span className="muted num" style={{ fontSize: 12.5 }}>
                    {formatDate(new Date(e.endedAt), lang)}
                  </span>
                  {e.qualityScore != null && (
                    <span className="score-badge num">{e.qualityScore}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card tight>
        <div className="summary-row">
          <div className="stat">
            <span className="stat-label">{t('history.avgDuration')}</span>
            <span className="stat-val num">
              {avgDur > 0 ? formatDuration(avgDur, lang) : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('history.avgQuality')}</span>
            <span className="stat-val num">{avgQ ?? '—'}</span>
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

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 8 }}>
          {t('chart.durationTarget')}
        </div>
        <BarChart
          data={series.map((s) => ({
            label: s.label,
            value: s.durationMin,
          }))}
          target={targetMin}
        />
      </Card>

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 8 }}>
          {t('chart.qualityTrend')}
        </div>
        <LineChart
          data={series.map((s) => ({
            label: s.label,
            value: s.qualityScore,
          }))}
        />
      </Card>

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 8 }}>
          {t('chart.conditionTrend')}
        </div>
        <LineChart
          data={conditionSeries.map((p) => ({
            label: p.label,
            value: p.index,
          }))}
          ariaLabel={t('chart.condition')}
        />
      </Card>

      {latestSharp && (
        <Card tight>
          <div className="spread" style={{ marginBottom: 8 }}>
            <span className="stat-label">{t('sharp.cardTitle')}</span>
            <span
              className={`score-badge num cond-${sharpnessTier(latestSharp.score)}`}
            >
              {latestSharp.score}
            </span>
          </div>
          <LineChart
            data={sharpSeries.map((p) => ({ label: p.label, value: p.score }))}
            ariaLabel={t('sharp.cardTitle')}
          />
          <div className="summary-row" style={{ marginTop: 8 }}>
            <div className="stat">
              <span className="stat-label">{t('sharp.medianShort')}</span>
              <span className="stat-val num">
                {t('sharp.ms', { ms: latestSharp.medianMs })}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">{t('sharp.agreement')}</span>
              <span className="stat-val">
                {agreement ? t(`sharp.agree.${agreement.level}`) : '—'}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="stat-label" style={{ marginBottom: 4 }}>
          {t('history.sessions')}
        </div>
        {sorted.length === 0 ? (
          <p className="empty">{t('history.empty')}</p>
        ) : (
          sorted.map((s) => (
            <button
              key={s.id}
              className="hist-item"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                color: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
              onClick={() => setSelected(s)}
            >
              <div className="spread">
                <span>{formatDate(new Date(s.endedAt), lang)}</span>
                <span className="score-badge num">
                  {s.qualityScore ?? '—'}
                </span>
              </div>
              <span className="muted num" style={{ fontSize: 13 }}>
                {formatDuration(s.durationMin, lang)} {t('sep.middot')}
                {isoToHm(s.startedAt)}–{isoToHm(s.endedAt)}
                {s.note ? ` ${t('sep.middot')}${s.note}` : ''}
              </span>
            </button>
          ))
        )}
      </Card>

      {selected && (
        <SessionDetail
          session={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
