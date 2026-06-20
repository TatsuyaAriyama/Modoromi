import { useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TimeDial } from '../../components/TimeDial';
import { Toggle } from '../../components/Toggle';
import type { ThemePref } from '../../domain/types';
import { formatDurationJa } from '../../domain/format';
import { exportAll, wipeAll } from '../../data/repositories';
import { isNative } from '../../lib/platform';

const THEME_LABEL: Record<ThemePref, string> = {
  auto: '自動',
  day: 'デイ',
  night: 'ナイト',
};

const DURATION_OPTIONS = [360, 390, 420, 450, 480, 510, 540];

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const init = useStore((s) => s.init);

  const [confirmWipe, setConfirmWipe] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const onExport = async () => {
    const json = await exportAll();
    if (isNative()) {
      setExported(json);
      return;
    }
    // Web: trigger a file download.
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `madoromi-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onWipe = async () => {
    await wipeAll();
    await init(); // reload from cleared storage → everything back to defaults
    setConfirmWipe(false);
    onClose();
  };

  return (
    <div className="screen">
      <div className="spread">
        <button className="back-btn" onClick={onClose}>
          ← 戻る
        </button>
        <h1 style={{ fontSize: 18 }}>設定</h1>
        <span style={{ width: 48 }} />
      </div>

      <Card>
        <div className="set-row">
          <span className="set-label">テーマ</span>
          <div className="seg">
            {(['auto', 'day', 'night'] as ThemePref[]).map((t) => (
              <button
                key={t}
                data-on={settings.theme === t}
                onClick={() => void saveSettings({ ...settings, theme: t })}
              >
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">目標睡眠時間</span>
          <select
            className="select"
            style={{ width: 130 }}
            value={settings.targetDurationMin}
            onChange={(e) =>
              void saveSettings({
                ...settings,
                targetDurationMin: Number(e.target.value),
              })
            }
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatDurationJa(m)}
              </option>
            ))}
          </select>
        </div>

        <div
          className="set-row"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
        >
          <span className="set-label">既定の起床時刻</span>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TimeDial
              value={settings.defaultWakeTime}
              onChange={(defaultWakeTime) =>
                void saveSettings({ ...settings, defaultWakeTime })
              }
              minuteStep={5}
            />
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">就寝リマインダー</span>
          <Toggle
            on={settings.bedtimeReminder}
            onChange={(bedtimeReminder) =>
              void saveSettings({ ...settings, bedtimeReminder })
            }
            label="就寝リマインダー"
          />
        </div>

        <div
          className="set-row"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
        >
          <div className="spread">
            <span className="set-label">スマート起床</span>
            <Toggle
              on={settings.smartAlarm}
              onChange={(smartAlarm) =>
                void saveSettings({ ...settings, smartAlarm })
              }
              label="スマート起床"
            />
          </div>
          <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            アラーム前30分以内に体動から浅い眠りを検知すると、少し早めに起こします。
            画面を点けたままのセッション中のみ動作します。
          </span>
        </div>
      </Card>

      <Card>
        <div className="set-row">
          <span className="set-label">データをエクスポート（JSON）</span>
          <Button variant="ghost" onClick={() => void onExport()}>
            書き出す
          </Button>
        </div>
        <div className="set-row">
          <span className="set-label" style={{ color: '#d9748a' }}>
            すべてのデータを削除
          </span>
          <Button variant="danger" onClick={() => setConfirmWipe(true)}>
            削除
          </Button>
        </div>
      </Card>

      <p className="banner">
        睡眠負債やスコアは健康・医療上の助言ではなく、あくまで目安です。
      </p>

      {exported && (
        <div className="sheet-backdrop" onClick={() => setExported(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18 }}>エクスポート</h2>
            <textarea
              className="textarea"
              style={{ minHeight: 220 }}
              readOnly
              value={exported}
            />
            <Button block onClick={() => setExported(null)}>
              閉じる
            </Button>
          </div>
        </div>
      )}

      {confirmWipe && (
        <div className="sheet-backdrop" onClick={() => setConfirmWipe(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18 }}>すべて削除しますか？</h2>
            <p className="muted">
              履歴・アラーム・設定がすべて消えます。この操作は取り消せません。
            </p>
            <Button variant="danger" block large onClick={() => void onWipe()}>
              すべて削除する
            </Button>
            <Button variant="ghost" block onClick={() => setConfirmWipe(false)}>
              やめる
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
