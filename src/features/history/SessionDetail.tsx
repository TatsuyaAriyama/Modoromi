import { useState } from 'react';
import '../screens.css';
import type { Mood, SleepSession } from '../../domain/types';
import { Button } from '../../components/Button';
import { MoodPicker } from '../../components/MoodPicker';
import { useStore } from '../../app/store';
import { computeQualityScore } from '../../domain/score';
import { formatDateJa, formatDurationJa, isoToHm } from '../../domain/format';

export function SessionDetail({
  session,
  onClose,
}: {
  session: SleepSession;
  onClose: () => void;
}) {
  const updateSession = useStore((s) => s.updateSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const targetMin = useStore((s) => s.settings.targetDurationMin);

  const [mood, setMood] = useState<Mood | undefined>(session.mood);
  const [note, setNote] = useState(session.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const qualityScore = mood
      ? computeQualityScore(session.durationMin, mood, targetMin)
      : undefined;
    await updateSession({
      ...session,
      mood,
      note: note.trim() ? note.trim() : undefined,
      qualityScore,
    });
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <h2 style={{ fontSize: 18 }}>
            {formatDateJa(new Date(session.endedAt))}
          </h2>
          <button className="back-btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="summary-row">
          <div className="stat">
            <span className="stat-label">睡眠時間</span>
            <span className="stat-val num">
              {formatDurationJa(session.durationMin)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">時間帯</span>
            <span className="stat-val num">
              {isoToHm(session.startedAt)}–{isoToHm(session.endedAt)}
            </span>
          </div>
        </div>

        <div className="field">
          <label>コンディション</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="field">
          <label>メモ</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button block large onClick={() => void save()}>
          保存
        </Button>

        {confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
              この記録を削除しますか？
            </span>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant="ghost"
                block
                onClick={() => setConfirmDelete(false)}
              >
                やめる
              </Button>
              <Button
                variant="danger"
                block
                onClick={() => {
                  void deleteSession(session.id);
                  onClose();
                }}
              >
                削除する
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="danger"
            block
            onClick={() => setConfirmDelete(true)}
          >
            この記録を削除
          </Button>
        )}
      </div>
    </div>
  );
}
