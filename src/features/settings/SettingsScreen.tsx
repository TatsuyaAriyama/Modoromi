import { useEffect, useState } from 'react';
import '../screens.css';
import { useStore } from '../../app/store';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TimeDial } from '../../components/TimeDial';
import { Toggle } from '../../components/Toggle';
import type { Lang, ThemePref } from '../../domain/types';
import { exportAll, importAll, wipeAll } from '../../data/repositories';
import { parseBackup } from '../../domain/backup';
import { sessionsToCsv } from '../../domain/csv';
import { isAndroid, isNative } from '../../lib/platform';
import { requestHealthAccess } from '../../lib/health';
import {
  requestSleepMotionUnrestricted,
  sleepMotionUnrestricted,
} from '../../lib/sleepMotion';
import { LANGS, formatDuration, translate } from '../../i18n/catalog';
import { useT, useLang } from '../../i18n/useT';

const DURATION_OPTIONS = [360, 390, 420, 450, 480, 510, 540];
const SMART_WINDOW_OPTIONS = [15, 20, 30, 45];

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const settings = useStore((s) => s.settings);
  const sessions = useStore((s) => s.sessions);
  const saveSettings = useStore((s) => s.saveSettings);
  const importFromHealth = useStore((s) => s.importFromHealth);
  const init = useStore((s) => s.init);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Android: reflect whether background sleep tracking is free from battery
  // optimization (so the recording service survives the night).
  const [unrestricted, setUnrestricted] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isAndroid()) return;
    let alive = true;
    void sleepMotionUnrestricted().then((u) => {
      if (alive) setUnrestricted(u);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [exported, setExported] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Web: trigger a file download. Native: show the text in a copyable sheet
  // (no Files entitlement assumed); the user can copy or AirDrop from there.
  const deliver = (filename: string, mime: string, text: string) => {
    if (isNative()) {
      setExported(text);
      return;
    }
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const onExport = async () => {
    const json = await exportAll();
    deliver(`madoromi-export-${stamp()}.json`, 'application/json', json);
  };

  const onExportCsv = () => {
    deliver(`madoromi-sleep-${stamp()}.csv`, 'text/csv', sessionsToCsv(sessions));
  };

  const onImport = async () => {
    const result = parseBackup(importText);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    await importAll(result.data);
    await init(); // reload everything from the restored data
    setImportOpen(false);
    setImportText('');
    setImportError(null);
    onClose();
  };

  // Enabling Health sync prompts for HealthKit write access first; we only
  // persist the toggle as "on" if the grant succeeds, so the switch never
  // claims to be syncing when iOS would silently drop the writes.
  const onToggleHealth = async (on: boolean) => {
    if (!on) {
      await saveSettings({ ...settings, healthSync: false });
      return;
    }
    const granted = await requestHealthAccess();
    await saveSettings({ ...settings, healthSync: granted });
  };

  const onImportHealth = async () => {
    setImporting(true);
    setImportMsg(null);
    const count = await importFromHealth(30);
    setImporting(false);
    setImportMsg(
      count > 0
        ? t('settings.healthImportResult', { count })
        : t('settings.healthImportNone'),
    );
  };

  const onRequestUnrestricted = async () => {
    await requestSleepMotionUnrestricted();
    // The system prompt opens in another screen; re-check on return.
    setUnrestricted(await sleepMotionUnrestricted());
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
          ← {t('common.back')}
        </button>
        <h1 style={{ fontSize: 18 }}>{t('settings.title')}</h1>
        <span style={{ width: 48 }} />
      </div>

      <Card>
        <div className="set-row">
          <span className="set-label">{t('lang.title')}</span>
          <div className="seg" role="group" aria-label={t('lang.title')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                data-on={settings.lang === l.id}
                aria-pressed={settings.lang === l.id}
                onClick={() =>
                  void saveSettings({ ...settings, lang: l.id as Lang })
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">{t('settings.theme')}</span>
          <div className="seg" role="group" aria-label={t('settings.theme')}>
            {(['auto', 'day', 'night'] as ThemePref[]).map((tp) => (
              <button
                key={tp}
                data-on={settings.theme === tp}
                aria-pressed={settings.theme === tp}
                onClick={() => void saveSettings({ ...settings, theme: tp })}
              >
                {t(`theme.${tp}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">{t('settings.targetDuration')}</span>
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
                {formatDuration(m, lang)}
              </option>
            ))}
          </select>
        </div>

        <div
          className="set-row"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
        >
          <span className="set-label">{t('settings.defaultWake')}</span>
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
          <span className="set-label">{t('settings.bedtimeReminder')}</span>
          <Toggle
            on={settings.bedtimeReminder}
            onChange={(bedtimeReminder) =>
              void saveSettings({ ...settings, bedtimeReminder })
            }
            label={t('settings.bedtimeReminder')}
          />
        </div>

        <div
          className="set-row"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
        >
          <div className="spread">
            <span className="set-label">{t('settings.weeklyReview')}</span>
            <Toggle
              on={settings.weeklyReview}
              onChange={(weeklyReview) =>
                void saveSettings({ ...settings, weeklyReview })
              }
              label={t('settings.weeklyReview')}
            />
          </div>
          <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            {t('settings.weeklyReviewHint')}
          </span>
        </div>

        {isNative() && (
          <div
            className="set-row"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
          >
            <div className="spread">
              <span className="set-label">{t('settings.healthSync')}</span>
              <Toggle
                on={settings.healthSync}
                onChange={(on) => void onToggleHealth(on)}
                label={t('settings.healthSync')}
              />
            </div>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {t('settings.healthSyncHint')}
            </span>
          </div>
        )}

        {isNative() && (
          <div
            className="set-row"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
          >
            <div className="spread">
              <span className="set-label">{t('settings.healthImport')}</span>
              <Button
                variant="ghost"
                disabled={importing}
                onClick={() => void onImportHealth()}
              >
                {importing
                  ? t('settings.healthImporting')
                  : t('settings.healthImportRun')}
              </Button>
            </div>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {importMsg ?? t('settings.healthImportHint')}
            </span>
          </div>
        )}

        {isAndroid() && unrestricted === false && (
          <div
            className="set-row"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
          >
            <div className="spread">
              <span className="set-label">{t('settings.bgTracking')}</span>
              <Button
                variant="ghost"
                onClick={() => void onRequestUnrestricted()}
              >
                {t('settings.bgTrackingFix')}
              </Button>
            </div>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {t('settings.bgTrackingHint')}
            </span>
          </div>
        )}

        {isNative() && (
          <div
            className="set-row"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
          >
            <span className="set-label">{t('settings.widget')}</span>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {t('settings.widgetHint')}
            </span>
          </div>
        )}

        <div
          className="set-row"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
        >
          <div className="spread">
            <span className="set-label">{t('settings.smartAlarm')}</span>
            <Toggle
              on={settings.smartAlarm}
              onChange={(smartAlarm) =>
                void saveSettings({ ...settings, smartAlarm })
              }
              label={t('settings.smartAlarm')}
            />
          </div>
          <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            {t('settings.smartAlarmHint', { min: settings.smartWindowMin })}
          </span>
          {settings.smartAlarm && (
            <div className="set-row" style={{ marginTop: 4 }}>
              <span className="set-label">{t('settings.smartWindow')}</span>
              <select
                className="select"
                style={{ width: 130 }}
                value={settings.smartWindowMin}
                onChange={(e) =>
                  void saveSettings({
                    ...settings,
                    smartWindowMin: Number(e.target.value),
                  })
                }
              >
                {SMART_WINDOW_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {formatDuration(m, lang)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="set-row">
          <span className="set-label">{t('settings.exportData')}</span>
          <Button variant="ghost" onClick={() => void onExport()}>
            {t('settings.export')}
          </Button>
        </div>
        <div className="set-row">
          <span className="set-label">{t('settings.exportCsvData')}</span>
          <Button variant="ghost" onClick={onExportCsv}>
            {t('settings.exportCsv')}
          </Button>
        </div>
        <div className="set-row">
          <span className="set-label">{t('settings.importData')}</span>
          <Button
            variant="ghost"
            onClick={() => {
              setImportError(null);
              setImportText('');
              setImportOpen(true);
            }}
          >
            {t('settings.import')}
          </Button>
        </div>
        <div className="set-row">
          <span className="set-label" style={{ color: '#d9748a' }}>
            {t('settings.wipeData')}
          </span>
          <Button variant="danger" onClick={() => setConfirmWipe(true)}>
            {t('common.delete')}
          </Button>
        </div>
      </Card>

      <p className="banner">{t('settings.disclaimer')}</p>

      {exported && (
        <div className="sheet-backdrop" onClick={() => setExported(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18 }}>{t('settings.exportTitle')}</h2>
            <textarea
              className="textarea"
              style={{ minHeight: 220 }}
              readOnly
              value={exported}
            />
            <Button block onClick={() => setExported(null)}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="sheet-backdrop" onClick={() => setImportOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18 }}>{t('settings.importTitle')}</h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              {t('settings.importHint')}
            </p>
            <textarea
              className="textarea"
              style={{ minHeight: 180 }}
              placeholder='{"app":"Madoromi", ...}'
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
            />
            {importError && (
              <span style={{ color: '#d9748a', fontSize: 13 }}>
                {translate(lang, `backup.${importError}`)}
              </span>
            )}
            <Button
              variant="primary"
              block
              large
              disabled={importText.trim() === ''}
              onClick={() => void onImport()}
            >
              {t('settings.importConfirm')}
            </Button>
            <Button variant="ghost" block onClick={() => setImportOpen(false)}>
              {t('common.cancel.soft')}
            </Button>
          </div>
        </div>
      )}

      {confirmWipe && (
        <div className="sheet-backdrop" onClick={() => setConfirmWipe(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18 }}>{t('settings.wipeTitle')}</h2>
            <p className="muted">{t('settings.wipeHint')}</p>
            <Button variant="danger" block large onClick={() => void onWipe()}>
              {t('settings.wipeConfirm')}
            </Button>
            <Button variant="ghost" block onClick={() => setConfirmWipe(false)}>
              {t('common.cancel.soft')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
