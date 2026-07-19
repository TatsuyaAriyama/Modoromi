export type TabKey = 'home' | 'alarm' | 'history';

/* Dock icons in the brand's line language — the eye, a bell, the skyline. */
export function TabIcon({ tab }: { tab: TabKey }) {
  switch (tab) {
    case 'home':
      // Closed eye — the Madoromi mark.
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10.5 Q12 16.5 20 10.5" />
          <line x1="6.5" y1="14.2" x2="5.2" y2="16.6" />
          <line x1="12" y1="15.6" x2="12" y2="18.3" />
          <line x1="17.5" y1="14.2" x2="18.8" y2="16.6" />
        </svg>
      );
    case 'alarm':
      // A quiet bell.
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4.5a5 5 0 0 0-5 5c0 2.9-.7 4.4-1.7 5.6-.35.42-.05 1.4.55 1.4h12.3c.6 0 .9-.98.55-1.4-1-1.2-1.7-2.7-1.7-5.6a5 5 0 0 0-5-5z" />
          <path d="M10.3 19.5a1.8 1.8 0 0 0 3.4 0" />
        </svg>
      );
    case 'history':
      // Mini skyline — same picture as the log.
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="4" y="11" width="3.6" height="9" rx="1.8" />
          <rect x="10.2" y="6" width="3.6" height="14" rx="1.8" />
          <rect x="16.4" y="9" width="3.6" height="11" rx="1.8" />
        </svg>
      );
  }
}
