// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { act } from 'react';
import { usePrefersReducedMotion } from './useReducedMotion';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A controllable matchMedia stub that can flip `matches` and fire change. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  let handler: (() => void) | null = null;
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return matches;
    },
    media: q,
    addEventListener: (_: string, fn: () => void) => (handler = fn),
    removeEventListener: () => (handler = null),
  }));
  return {
    set(next: boolean) {
      matches = next;
      handler?.();
    },
  };
}

function Probe({ onValue }: { onValue: (v: boolean) => void }) {
  onValue(usePrefersReducedMotion());
  return null;
}

describe('usePrefersReducedMotion', () => {
  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    let value = true;
    render(<Probe onValue={(v) => (value = v)} />);
    expect(value).toBe(false);
  });

  it('reflects the initial preference', () => {
    stubMatchMedia(true);
    let value = false;
    render(<Probe onValue={(v) => (value = v)} />);
    expect(value).toBe(true);
  });

  it('reacts when the preference changes', () => {
    const mq = stubMatchMedia(false);
    const seen: boolean[] = [];
    render(<Probe onValue={(v) => seen.push(v)} />);
    expect(seen.at(-1)).toBe(false);
    act(() => mq.set(true));
    expect(seen.at(-1)).toBe(true);
  });
});
