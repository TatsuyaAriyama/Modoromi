// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorialScreen } from './TutorialScreen';
import { useStore } from '../../app/store';
import { DEFAULT_SETTINGS } from '../../data/repositories';

beforeEach(() => {
  localStorage.clear();
  useStore.setState({
    loaded: true,
    sessions: [],
    alarms: [],
    settings: { ...DEFAULT_SETTINGS, tutorialSeen: false },
    active: null,
    pendingMorning: null,
  });
});
afterEach(cleanup);

describe('TutorialScreen', () => {
  it('opens on the welcome slide', () => {
    render(<TutorialScreen />);
    expect(screen.getByText('Welcome to Madoromi')).toBeTruthy();
  });

  it('advances through the slides with Next', () => {
    render(<TutorialScreen />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Your day, at a glance')).toBeTruthy();
  });

  it('marks the tutorial seen when finished', async () => {
    render(<TutorialScreen />);
    // Five slides: click Next four times, then the final "Get started".
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Get started'));
    await waitFor(() =>
      expect(useStore.getState().settings.tutorialSeen).toBe(true),
    );
  });

  it('marks it seen when skipped', async () => {
    render(<TutorialScreen />);
    fireEvent.click(screen.getByText('Skip'));
    await waitFor(() =>
      expect(useStore.getState().settings.tutorialSeen).toBe(true),
    );
  });
});
