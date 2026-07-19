import { useEffect, useState, type CSSProperties } from 'react';
import './app/app.css';
import { useStore } from './app/store';
import { useTheme } from './app/useTheme';
import { NightSky } from './components/NightSky';
import { TabIcon, type TabKey } from './components/TabIcon';
import { HomeScreen } from './features/home/HomeScreen';
import { AlarmScreen } from './features/alarm/AlarmScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SessionScreen } from './features/session/SessionScreen';
import { MorningScreen } from './features/morning/MorningScreen';
import { NapScreen } from './features/nap/NapScreen';
import { WindDownScreen } from './features/winddown/WindDownScreen';
import { OnboardingScreen } from './features/onboarding/OnboardingScreen';
import { useT, useLang } from './i18n/useT';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'home', labelKey: 'tab.home' },
  { key: 'alarm', labelKey: 'tab.alarm' },
  { key: 'history', labelKey: 'tab.history' },
];

/** Slot index the dock's violet plane translates to. */
const TAB_INDEX: Record<TabKey, number> = { home: 0, alarm: 1, history: 2 };

export default function App() {
  const t = useT();
  const lang = useLang();
  useTheme();
  const init = useStore((s) => s.init);
  const loaded = useStore((s) => s.loaded);
  const onboarded = useStore((s) => s.settings.onboarded);
  const active = useStore((s) => s.active);
  const pendingMorning = useStore((s) => s.pendingMorning);
  const startSession = useStore((s) => s.startSession);

  const [tab, setTab] = useState<TabKey>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [napOpen, setNapOpen] = useState(false);
  const [windDownOpen, setWindDownOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  // Reflect the UI language on <html lang> so assistive tech pronounces
  // content (and the right hyphenation/voice) for the chosen language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!loaded) {
    return <div className="app-frame" />;
  }

  // First launch: brand intro + goal + notification permission.
  if (!onboarded) return <OnboardingScreen />;

  // Full-screen flows take over.
  if (active) return <SessionScreen />;
  if (pendingMorning) return <MorningScreen />;
  if (napOpen) return <NapScreen onClose={() => setNapOpen(false)} />;
  if (windDownOpen) {
    return (
      <WindDownScreen
        onStart={() => {
          setWindDownOpen(false);
          startSession();
        }}
        onClose={() => setWindDownOpen(false)}
      />
    );
  }

  return (
    <div className="app-frame">
      <NightSky />
      {settingsOpen ? (
        <SettingsScreen onClose={() => setSettingsOpen(false)} />
      ) : (
        <>
          {tab === 'home' && (
            <HomeScreen
              onOpenSettings={() => setSettingsOpen(true)}
              onGoAlarm={() => setTab('alarm')}
              onGoLog={() => setTab('history')}
              onStartNap={() => setNapOpen(true)}
              onWindDown={() => setWindDownOpen(true)}
            />
          )}
          {tab === 'alarm' && <AlarmScreen />}
          {tab === 'history' && <HistoryScreen />}
        </>
      )}

      {!settingsOpen && (
        <nav
          className="tabbar"
          style={{ '--tab-i': TAB_INDEX[tab] } as CSSProperties}
        >
          <span className="tab-pill" aria-hidden="true" />
          {TABS.map((tab2) => (
            <button
              key={tab2.key}
              className="tab"
              data-active={tab === tab2.key}
              aria-current={tab === tab2.key ? 'page' : undefined}
              onClick={() => setTab(tab2.key)}
            >
              <span className="tab-inner">
                <TabIcon tab={tab2.key} />
                <span className="tab-label">{t(tab2.labelKey)}</span>
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
