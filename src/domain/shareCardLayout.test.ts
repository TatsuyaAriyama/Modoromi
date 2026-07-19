import { describe, expect, it } from 'vitest';
import { buildShareCard, type ShareLabels } from './shareCard';
import {
  CAP_ANGLE,
  CARD_H,
  CARD_W,
  MIN_SWEEP,
  buildCardOps,
  fitText,
  theta,
  type Measure,
  type Op,
} from './shareCardLayout';
import type { SleepSession } from './types';

/** jsdom has no canvas, so the layout is measured with a deterministic stub. */
const measure: Measure = (s, size) => s.length * size * 0.55;

const LABELS: ShareLabels = {
  date: '7月19日(日)',
  duration: '7時間30分',
  bedHm: '23:40',
  wakeHm: '07:10',
};
function ops(over: Partial<SleepSession> = {}, opts = { showTimes: false }) {
  const s: SleepSession = {
    id: 'n1',
    startedAt: '2026-07-18T23:40:00',
    endedAt: '2026-07-19T07:10:00',
    durationMin: 450,
    ...over,
  };
  return buildCardOps(buildShareCard(s, LABELS, opts), measure);
}

const texts = (list: Op[]) =>
  list.filter((o): o is Extract<Op, { k: 'text' }> => o.k === 'text');

describe('buildCardOps', () => {
  it('paints a ground that covers the whole card', () => {
    const first = ops()[0];
    expect(first).toEqual({ k: 'rect', x: 0, y: 0, w: CARD_W, h: CARD_H, fill: 'ground' });
  });

  it('never emits rose, and never emits an unknown ink', () => {
    const allowed = ['ground', 'plane', 'arcInk', 'lavender', 'mist', 'mint'];
    for (const o of ops({ theme: '論文を書く' }, { showTimes: true })) {
      const ink = 'fill' in o ? o.fill : 'ink' in o ? o.ink : null;
      if (ink) expect(allowed).toContain(ink);
    }
  });

  it('keeps every op inside the card bounds', () => {
    for (const o of ops()) {
      if (o.k === 'rect') {
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.x + o.w).toBeLessThanOrEqual(CARD_W);
        expect(o.y + o.h).toBeLessThanOrEqual(CARD_H);
      }
      if (o.k === 'line') {
        for (const v of [o.x1, o.x2]) expect(v).toBeGreaterThanOrEqual(0);
        for (const v of [o.x1, o.x2]) expect(v).toBeLessThanOrEqual(CARD_W);
        for (const v of [o.y1, o.y2]) expect(v).toBeLessThanOrEqual(CARD_H);
      }
      if (o.k === 'dot') {
        expect(o.cx - o.r).toBeGreaterThanOrEqual(0);
        expect(o.cx + o.r).toBeLessThanOrEqual(CARD_W);
      }
    }
  });

  it('draws no time text unless the user opted in', () => {
    const off = texts(ops()).map((t) => t.s).join(' ');
    expect(off).not.toContain('23:40');
    const on = texts(ops({}, { showTimes: true })).map((t) => t.s).join(' ');
    expect(on).toContain('23:40 → 07:10');
  });

  it('draws no free text at all — not the note, not the theme', () => {
    const drawn = texts(
      ops({ note: '薬を飲んだ', theme: '論文の章立てを整理する' }, { showTimes: true }),
    )
      .map((t) => t.s)
      .join(' ');
    expect(drawn).not.toContain('薬');
    // The theme is prose and the user does not want prose on the card. It has
    // no flag and no path to the canvas — this asserts the absence of both.
    expect(drawn).not.toContain('論文');
  });

  it('paints only the wordmark, the date, and the duration as words', () => {
    const drawn = texts(ops()).map((t) => t.s);
    expect(drawn).toEqual(['Madoromi', '7月19日(日)', '7', '時間', '30', '分']);
  });

  it('anchors the arc at the bed minute and sweeps the night', () => {
    const arc = ops().find((o) => o.k === 'ring' && o.lw === 26);
    expect(arc).toBeDefined();
    if (arc?.k !== 'ring') throw new Error('not a ring');
    expect(arc.a0).toBeCloseTo(theta(23 * 60 + 40), 6);
    expect(arc.sweep).toBeCloseTo((450 / 1440) * Math.PI * 2, 6);
  });

  it('keeps a 20-minute nap above the visibility floor', () => {
    const nap = { startedAt: '2026-07-19T14:00:00', endedAt: '2026-07-19T14:20:00', durationMin: 20 };
    const arc = ops(nap).find((o) => o.k === 'ring' && o.lw === 26);
    const dot = ops(nap).find((o) => o.k === 'dot' && o.fill === 'mint');
    if (arc?.k !== 'ring' || dot?.k !== 'dot') throw new Error('missing arc or dot');
    expect(arc.cap).toBe('round');
    // The drawn range is inset by the cap bleed, so the lozenge's visible tip
    // lands ON the mint dot rather than a half-stroke beyond it.
    const tip = arc.a0 + arc.sweep + CAP_ANGLE;
    const at = theta(14 * 60) + MIN_SWEEP;
    expect(tip).toBeCloseTo(at, 6);
    expect(dot.cx).toBeCloseTo(540 + 344 * Math.cos(at), 6);
    expect(dot.cy).toBeCloseTo(764 + 344 * Math.sin(at), 6);
  });

  it('does not inset a full night, where a butt cap has no bleed', () => {
    const arc = ops().find((o) => o.k === 'ring' && o.lw === 26);
    if (arc?.k !== 'ring') throw new Error('not a ring');
    expect(arc.cap).toBeUndefined();
    expect(arc.a0).toBeCloseTo(theta(23 * 60 + 40), 6);
  });

  it('never lets the hero numeral exceed its column', () => {
    // A deliberately huge label must step down the ladder rather than overflow.
    const wide = buildCardOps(
      buildShareCard(
        { id: 'x', startedAt: '2026-07-18T22:00:00', endedAt: '2026-07-19T09:05:00', durationMin: 665 },
        { ...LABELS, duration: '11時間05分' },
        { showTimes: false },
      ),
      measure,
    );
    const heroRuns = texts(wide).filter((t) => t.face === 'num' && t.y === 800);
    const total = heroRuns.reduce((w, t) => w + measure(t.s, t.size, 'num'), 0);
    expect(total).toBeLessThanOrEqual(508);
  });
});

describe('fitText', () => {
  it('takes the largest size that fits', () => {
    expect(fitText('短い', 999, [48, 40, 34], 'display', measure).size).toBe(48);
  });

  it('ellipsizes on code points, keeping surrogate pairs whole', () => {
    const r = fitText('𩸽𩸽𩸽𩸽𩸽𩸽𩸽𩸽', 60, [48, 34], 'display', measure);
    expect(r.text.endsWith('…')).toBe(true);
    // No lone surrogate survived the truncation.
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(r.text)).toBe(false);
  });
});
