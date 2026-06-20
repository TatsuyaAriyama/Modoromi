import { useState } from 'react';
import '../screens.css';
import type { Mood, SleepSession } from '../../domain/types';
import { Button } from '../../components/Button';
import { MoodPicker } from '../../components/MoodPicker';
import { MovementGraph } from '../../components/MovementGraph';
import { useStore } from '../../app/store';
import { computeQualityScore } from '../../domain/score';
import { movementHistogram, restlessnessLevel } from '../../domain/motion';
import { formatDate, formatDuration, isoToHm } from '../../domain/format';
import { useT, useLang } from '../../i18n/useT';

export function SessionDetail({
  session,
  onClose,
}: {
  session: SleepSession;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const updateSession = useStore((s) => s.updateSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const targetMin = useStore((s) => s.settings.targetDurationMin);

  const [mood, setMood] = useState<Mood | undefined>(session.mood);
  const [note, setNote] = useState(session.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const qualityScore = mood
      ? computeQualityScore(
          session.durationMin,
          mood,
          targetMin,
          session.movements,
        )
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
            {formatDate(new Date(session.endedAt), lang)}
          </h2>
          <button className="back-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className="summary-row">
          <div className="stat">
            <span className="stat-label">{t('detail.duration')}</span>
            <span className="stat-val num">
              {formatDuration(session.durationMin, lang)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('detail.timeRange')}</span>
            <span className="stat-val num">
              {isoToHm(session.startedAt)}–{isoToHm(session.endedAt)}
            </span>
          </div>
        </div>

        {session.movements && (
          <div className="field">
            <label>{t('motion.title')}</label>
            <div className="spread" style={{ marginBottom: 6 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {t(
                  `motion.${restlessnessLevel(
                    session.movements.length,
                    session.durationMin,
                  )}`,
                )}
              </span>
              <span className="muted num" style={{ fontSize: 13 }}>
                {t('motion.count', { count: session.movements.length })}
              </span>
            </div>
            <MovementGraph
              bins={movementHistogram(
                session.movements,
                session.durationMin,
              )}
            />
          </div>
        )}

        <div className="field">
          <label>{t('detail.condition')}</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="field">
          <label>{t('detail.note')}</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button block large onClick={() => void save()}>
          {t('common.save')}
        </Button>

        {confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
              {t('detail.confirmDelete')}
            </span>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant="ghost"
                block
                onClick={() => setConfirmDelete(false)}
              >
                {t('common.cancel.soft')}
              </Button>
              <Button
                variant="danger"
                block
                onClick={() => {
                  void deleteSession(session.id);
                  onClose();
                }}
              >
                {t('detail.deleteConfirm')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="danger"
            block
            onClick={() => setConfirmDelete(true)}
          >
            {t('detail.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
