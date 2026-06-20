import { useEffect, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Button } from '../../components/Button';
import { EyeMark } from '../../components/EyeMark';
import { MoodPicker } from '../../components/MoodPicker';
import type { Mood } from '../../domain/types';
import { formatDurationJa, isoToHm } from '../../domain/format';
import { notifySuccess } from '../../lib/haptics';

export function MorningScreen() {
  const pending = useStore((s) => s.pendingMorning);
  const saveMorningCheck = useStore((s) => s.saveMorningCheck);
  const dismissMorning = useStore((s) => s.dismissMorning);

  const [eyeOpen, setEyeOpen] = useState(false);
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [subjective, setSubjective] = useState(3);
  const [note, setNote] = useState('');

  // Closed → open micro-interaction on mount.
  useEffect(() => {
    const t = setTimeout(() => setEyeOpen(true), 250);
    return () => clearTimeout(t);
  }, []);

  if (!pending) return null;

  const save = async () => {
    if (!mood) return;
    await saveMorningCheck({ mood, subjective, note });
    void notifySuccess();
  };

  return (
    <div className="app-frame">
      <div className="screen morning-wrap">
        <EyeMark size={72} color="var(--primary)" open={eyeOpen} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>おはようございます</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {isoToHm(pending.startedAt)} → {isoToHm(pending.endedAt)}
          </p>
          <div className="morning-dur num">
            {formatDurationJa(pending.durationMin)}
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="stat-label">今朝のコンディション</span>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="field" style={{ width: '100%' }}>
          <label>主観的な眠りの質（1〜5）</label>
          <input
            className="input"
            type="range"
            min={1}
            max={5}
            value={subjective}
            onChange={(e) => setSubjective(Number(e.target.value))}
          />
          <span className="muted num" style={{ alignSelf: 'center' }}>
            {subjective}
          </span>
        </div>

        <div className="field" style={{ width: '100%' }}>
          <label>ひとことメモ（任意）</label>
          <textarea
            className="textarea"
            value={note}
            placeholder="夢を見た / 途中で目が覚めた など"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button block large disabled={!mood} onClick={() => void save()}>
            保存する
          </Button>
          <Button variant="ghost" block onClick={dismissMorning}>
            あとで（時間だけ記録）
          </Button>
        </div>
      </div>
    </div>
  );
}
