import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { EyeMark } from '../../components/EyeMark';
import {
  debtStatus,
  lastSession,
  sleepDebtMin,
} from '../../domain/debt';
import {
  formatDateJa,
  formatDurationJa,
  isoToHm,
  subtractMinutesHm,
} from '../../domain/format';
import { isQualityConfirmed } from '../../domain/score';
import { tapMedium } from '../../lib/haptics';

const DEBT_COPY: Record<ReturnType<typeof debtStatus>, string> = {
  good: '思考のキレを保ちやすい状態です',
  mild: '少し負債がたまっています。今夜は早めの就寝を',
  notable: '思考のキレに影響が出やすい状態です',
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
  const status = debtStatus(debt);

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

      {/* Sleep debt */}
      <Card tight>
        <div className="spread">
          <div>
            <div className="stat-label">睡眠負債（直近7日）</div>
            <div className="stat-val num" style={{ fontSize: 24 }}>
              {debt > 0
                ? `-${formatDurationJa(debt)}`
                : formatDurationJa(0)}
            </div>
          </div>
          <EyeMark size={36} color="var(--text-mute)" />
        </div>
        <p className={`muted debt-status-${status}`} style={{ fontSize: 13, marginTop: 6 }}>
          {DEBT_COPY[status]}
        </p>
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
