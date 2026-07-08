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
    expect(screen.getByText(/Welcome to Madoromi/)).toBeTruthy();
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

describe('TutorialScreen swipe', () => {
  const swipe = (el: Element, fromX: number, toX: number) => {
    fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: 300 }] });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: toX, clientY: 300 }] });
  };

  it('swiping left advances, swiping right goes back', () => {
    const { container } = render(<TutorialScreen />);
    const inner = container.querySelector('.onb-inner') as Element;
    swipe(inner, 300, 100); // left
    expect(screen.getByText('Your day, at a glance')).toBeTruthy();
    swipe(inner, 100, 300); // right
    expect(screen.getByText(/Welcome to Madoromi/)).toBeTruthy();
  });

  it('ignores short drags (a tap is not a swipe)', () => {
    const { container } = render(<TutorialScreen />);
    const inner = container.querySelector('.onb-inner') as Element;
    swipe(inner, 300, 280);
    expect(screen.getByText(/Welcome to Madoromi/)).toBeTruthy();
  });
});
