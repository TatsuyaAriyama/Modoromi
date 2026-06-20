import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { EyeMark } from '../../components/EyeMark';
import { lastSession, sleepDebtMin } from '../../domain/debt';
import {
  consistencyScore,
  regularityLevel,
  type RegularityLevel,
} from '../../domain/consistency';
import { thinkingCondition, type ThinkingTier } from '../../domain/condition';
import {
  formatDateJa,
  formatDurationJa,
  isoToHm,
  subtractMinutesHm,
} from '../../domain/format';
import { isQualityConfirmed } from '../../domain/score';
import { tapMedium } from '../../lib/haptics';

const TIER_LABEL: Record<ThinkingTier, string> = {
  sharp: '冴えている',
  steady: 'おだやか',
  foggy: 'ややぼんやり',
  depleted: '要回復',
};

const TIER_COPY: Record<ThinkingTier, string> = {
  sharp: '思考がよく回りそうな一日です',
  steady: '安定したコンディションです',
  foggy: '無理せず、軽めの集中から始めましょう',
  depleted: '回復を優先して。今夜は早めの就寝を',
};

const REGULARITY_LABEL: Record<RegularityLevel, string> = {
  high: '高い',
  medium: 'ふつう',
  low: 'ばらつき',
};

export function HomeScreen({
  onOpenSettings,
  onGoAlarm,
}: {
  onOpenSettings: () => void;
  onGoAlarm: () => void;
}) {
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const alarms = useStore((s) => s.alarms);
  const startSession = useStore((s) => s.startSession);

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

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .map((a) => a.time)
    .sort()[0];
  const reminderTime = settings.bedtimeReminder
    ? subtractMinutesHm(settings.defaultWakeTime, settings.targetDurationMin)
    : undefined;

  return (
    <div className="screen">
      <div className="home-head">
        <div>
          <div className="home-date">{formatDateJa(new Date())}</div>
          <h1 className="home-greeting">おやすみの準備を</h1>
        </div>
        <button
          className="icon-btn"
          aria-label="設定"
          onClick={onOpenSettings}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Last night summary */}
      <Card>
        <div className="stat-label">昨夜のサマリー</div>
        {last ? (
          <>
            <div className="summary-big num">
              {formatDurationJa(last.durationMin)}
            </div>
            <div className="summary-row">
              <div className="stat">
                <span className="stat-label">目標との差</span>
                <span className="stat-val num">
                  {formatDurationJa(
                    last.durationMin - settings.targetDurationMin,
                  )}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">質スコア</span>
                <span className="stat-val num">
                  {isQualityConfirmed(last) ? last.qualityScore : '—'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            まだ記録がありません
          </p>
        )}
      </Card>

      {/* Thinking condition (synthesises quality, debt, regularity) */}
      <Card tight>
        <div className="spread">
          <div className="stat-label">今日の思考コンディション</div>
          <EyeMark size={36} color="var(--text-mute)" />
        </div>
        <div className={`cond-headline cond-${condition.tier}`}>
          {TIER_LABEL[condition.tier]}
          <span className="cond-index num">{condition.index}</span>
        </div>
        <p className={`muted cond-${condition.tier}`} style={{ fontSize: 13 }}>
          {TIER_COPY[condition.tier]}
        </p>
        <div className="summary-row" style={{ marginTop: 10 }}>
          <div className="stat">
            <span className="stat-label">睡眠負債（7日）</span>
            <span className="stat-val num">
              {debt > 0 ? `-${formatDurationJa(debt)}` : formatDurationJa(0)}
            </span>
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

      {/* Primary CTA */}
      <div className="cta-wrap">
        {reminderTime && (
          <span className="pill">就寝リマインダー {reminderTime}</span>
        )}
        {last && !isQualityConfirmed(last) && (
          <span className="muted" style={{ fontSize: 13 }}>
            起床 {isoToHm(last.endedAt)} ・ 朝のチェック未入力
          </span>
        )}
        <button
          className="cta-hero"
          onClick={() => {
            void tapMedium();
            startSession();
          }}
        >
          <EyeMark size={40} color="var(--mist)" />
          おやすみ
        </button>
        {!nextAlarm && (
          <button className="back-btn" onClick={onGoAlarm}>
            アラームを設定する →
          </button>
        )}
      </div>
    </div>
  );
}
