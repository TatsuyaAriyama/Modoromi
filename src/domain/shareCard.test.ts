import { describe, expect, it } from 'vitest';
import { buildShareCard, type ShareLabels } from './shareCard';
import type { SleepSession } from './types';

const LABELS: ShareLabels = {
  date: '7月19日(日)',
  duration: '7時間30分',
  bedHm: '23:40',
  wakeHm: '07:10',
};

function night(over: Partial<SleepSession> = {}): SleepSession {
  return {
    id: 'n1',
    startedAt: '2026-07-18T23:40:00',
    endedAt: '2026-07-19T07:10:00',
    durationMin: 450,
    ...over,
  };
}

describe('buildShareCard', () => {
  it('omits the times entirely rather than blanking them', () => {
    const m = buildShareCard(night(), LABELS, { showTimes: false, showTheme: false });
    // Absence of the KEY, not a falsy value: a painter bug cannot leak what
    // the model never carried.
    expect(m).not.toHaveProperty('timesLabel');
    expect(JSON.stringify(m)).not.toContain('23:40');
    expect(JSON.stringify(m)).not.toContain('07:10');
  });

  it('carries the times only when the user opted in', () => {
    const m = buildShareCard(night(), LABELS, { showTimes: true, showTheme: false });
    expect(m.timesLabel).toBe('23:40 → 07:10');
  });

  it('never carries the private note, under any option combination', () => {
    const s = night({ note: '寝る前に薬を飲んだ', theme: '論文を書く' });
    for (const showTimes of [true, false]) {
      for (const showTheme of [true, false]) {
        const json = JSON.stringify(buildShareCard(s, LABELS, { showTimes, showTheme }));
        expect(json).not.toContain('薬');
      }
    }
  });

  it('omits an empty or whitespace theme even when the flag is on', () => {
    for (const theme of [undefined, '', '   ']) {
      const m = buildShareCard(night({ theme }), LABELS, {
        showTimes: false,
        showTheme: true,
      });
      expect(m).not.toHaveProperty('theme');
    }
  });

  it('measures a midnight-crossing night the short way round the dial', () => {
    // 23:40 → 07:10 is 450 minutes forward, not 1430 backward.
    expect(buildShareCard(night(), LABELS, { showTimes: false, showTheme: false }).sweepMin)
      .toBe(450);
    expect(buildShareCard(night(), LABELS, { showTimes: false, showTheme: false }).bedMin)
      .toBe(23 * 60 + 40);
  });

  it('falls back to the real duration when bed and wake share a clock minute', () => {
    const s = night({
      startedAt: '2026-07-18T23:00:00',
      endedAt: '2026-07-19T23:00:00',
      durationMin: 1440,
    });
    const m = buildShareCard(s, LABELS, { showTimes: false, showTheme: false });
    expect(m.sweepMin).toBe(1440);
  });

  it('keeps a 20-minute nap as a real, non-zero sweep', () => {
    const s = night({
      startedAt: '2026-07-19T14:00:00',
      endedAt: '2026-07-19T14:20:00',
      durationMin: 20,
    });
    expect(buildShareCard(s, LABELS, { showTimes: false, showTheme: false }).sweepMin)
      .toBe(20);
  });
});
