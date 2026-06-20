import { useEffect, useState } from 'react';
import './app/app.css';
import { useStore } from './app/store';
import { useTheme } from './app/useTheme';
import { TabIcon, type TabKey } from './components/TabIcon';
import { HomeScreen } from './features/home/HomeScreen';
import { AlarmScreen } from './features/alarm/AlarmScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SessionScreen } from './features/session/SessionScreen';
import { MorningScreen } from './features/morning/MorningScreen';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: '今日' },
  { key: 'alarm', label: 'アラーム' },
  { key: 'history', label: '記録' },
];

export default function App() {
  useTheme();
  const init = useStore((s) => s.init);
  const loaded = useStore((s) => s.loaded);
  const active = useStore((s) => s.active);
  const pendingMorning = useStore((s) => s.pendingMorning);

  const [tab, setTab] = useState<TabKey>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  if (!loaded) {
    return <div className="app-frame" />;
  }

  // Full-screen flows take over.
  if (active) return <SessionScreen />;
  if (pendingMorning) return <MorningScreen />;

  return (
    <div className="app-frame">
      {settingsOpen ? (
        <SettingsScreen onClose={() => setSettingsOpen(false)} />
      ) : (
        <>
          {tab === 'home' && (
            <HomeScreen
              onOpenSettings={() => setSettingsOpen(true)}
              onGoAlarm={() => setTab('alarm')}
            />
          )}
          {tab === 'alarm' && <AlarmScreen />}
          {tab === 'history' && <HistoryScreen />}
        </>
      )}

      {!settingsOpen && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              className="tab"
              data-active={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              <TabIcon tab={t.key} />
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
