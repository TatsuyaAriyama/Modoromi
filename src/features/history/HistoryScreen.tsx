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
  type RegularityLevel,
} from '../../domain/consistency';
import { weeklyReview } from '../../domain/review';
import {
  formatDateJa,
  formatDurationJa,
  isoToHm,
} from '../../domain/format';
import type { SleepSession } from '../../domain/types';

type Range = 'week' | 'month';

const REGULARITY_LABEL: Record<RegularityLevel, string> = {
  high: '高い',
  medium: 'ふつう',
  low: 'ばらつき',
};

export function HistoryScreen() {
  const sessions = useStore((s) => s.sessions);
  const targetMin = useStore((s) => s.settings.targetDurationMin);
  const [range, setRange] = useState<Range>('week');
  const [selected, setSelected] = useState<SleepSession | null>(null);

  const days = range === 'week' ? 7 : 30;
  const series = useMemo(
    () => buildDaySeries(sessions, days),
    [sessions, days],
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
        <h1 className="screen-title">記録</h1>
        <div className="seg">
          <button data-on={range === 'week'} onClick={() => setRange('week')}>
            週
          </button>
          <button
            data-on={range === 'month'}
            onClick={() => setRange('month')}
          >
            月
          </button>
        </div>
      </div>

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 6 }}>
          今週の振り返り
        </div>
        <p className="review-headline">{review.headline}</p>
        {review.loggedNights > 0 && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            記録 {review.loggedNights}日
            {review.qualityDeltaVsPrev != null &&
              ` ・ 先週比 ${review.qualityDeltaVsPrev > 0 ? '+' : ''}${review.qualityDeltaVsPrev}`}
          </span>
        )}
      </Card>

      <Card tight>
        <div className="summary-row">
          <div className="stat">
            <span className="stat-label">平均睡眠時間</span>
            <span className="stat-val num">
              {avgDur > 0 ? formatDurationJa(avgDur) : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">平均質スコア</span>
            <span className="stat-val num">{avgQ ?? '—'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">規則性</span>
            <span className="stat-val">
              {consistency == null
                ? '—'
                : REGULARITY_LABEL[regularityLevel(consistency)]}
            </span>
          </div>
        </div>
      </Card>

      <Card tight>
        <div className="stat-label" style={{ marginBottom: 8 }}>
          睡眠時間（点線 = 目標）
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
          質スコアの推移
        </div>
        <LineChart
          data={series.map((s) => ({
            label: s.label,
            value: s.qualityScore,
          }))}
        />
      </Card>

      <Card>
        <div className="stat-label" style={{ marginBottom: 4 }}>
          セッション
        </div>
        {sorted.length === 0 ? (
          <p className="empty">まだ記録がありません</p>
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
                <span>{formatDateJa(new Date(s.endedAt))}</span>
                <span className="score-badge num">
                  {s.qualityScore ?? '—'}
                </span>
              </div>
              <span className="muted num" style={{ fontSize: 13 }}>
                {formatDurationJa(s.durationMin)} ・ {isoToHm(s.startedAt)}–
                {isoToHm(s.endedAt)}
                {s.note ? ` ・ ${s.note}` : ''}
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
