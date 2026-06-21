// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HistoryScreen } from './HistoryScreen';
import { useStore } from '../../app/store';
import { DEFAULT_SETTINGS } from '../../data/repositories';
import type { SleepSession } from '../../domain/types';

/**
 * A thin UI integration test: render a real screen against the live store and
 * assert it reflects store state. Proves the React Testing Library harness and
 * the store→screen binding (useT/useLang read the store directly, no provider).
 */
function seed(sessions: SleepSession[]) {
  useStore.setState({
    loaded: true,
    sessions,
    alarms: [],
    settings: DEFAULT_SETTINGS,
    active: null,
    pendingMorning: null,
  });
}

beforeEach(() => seed([]));
afterEach(cleanup);

describe('HistoryScreen', () => {
  it('shows the empty state when there are no sessions', () => {
    render(<HistoryScreen />);
    expect(screen.getByText('No records yet')).toBeTruthy();
  });

  it('renders a logged session and hides the empty state', () => {
    seed([
      {
        id: 'a',
        startedAt: '2026-06-20T23:00:00',
        endedAt: '2026-06-21T07:00:00',
        durationMin: 480,
        mood: 'fresh',
        qualityScore: 82,
      },
    ]);
    render(<HistoryScreen />);
    expect(screen.queryByText('No records yet')).toBeNull();
    // The quality score surfaces in the session list badge.
    expect(screen.getAllByText('82').length).toBeGreaterThanOrEqual(1);
  });

  it('reflects the Japanese language setting from the store', () => {
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, lang: 'ja' } });
    render(<HistoryScreen />);
    expect(screen.getByText('まだ記録がありません')).toBeTruthy();
  });

  it('exposes the range control state via aria-pressed', () => {
    render(<HistoryScreen />);
    const week = screen.getByRole('button', { name: 'Week', pressed: true });
    const month = screen.getByRole('button', { name: 'Month', pressed: false });
    expect(week).toBeTruthy();
    expect(month).toBeTruthy();
  });
});
