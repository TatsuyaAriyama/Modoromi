export type TabKey = 'home' | 'alarm' | 'history';

export function TabIcon({ tab }: { tab: TabKey }) {
  switch (tab) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case 'alarm':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5" />
          <path d="M5 3 2 6M19 3l3 3" />
        </svg>
      );
    case 'history':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
  }
}
