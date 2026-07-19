import type { ShareCardModel } from './shareCard';

/**
 * The card as a list of drawing operations. Pure — no canvas, no DOM, no
 * colour lookups from the live theme — so it is fully testable under jsdom
 * and so the sleep theme can never bleed into an exported image.
 *
 * 4:5 is the tallest ratio Instagram will not crop, and it survives X's
 * timeline crop through the centre band where the orbit sits.
 */

export const CARD_W = 1080;
export const CARD_H = 1350;
/** The app's 1px hairline is 1/390 of a 390pt viewport; 1080/390 ≈ 2.77 → 3. */
export const HAIRLINE = 3;

/** Rose is absent by construction: a failure colour is unrepresentable here. */
export type Ink = 'ground' | 'plane' | 'arcInk' | 'lavender' | 'mist' | 'mint';
export type Face = 'display' | 'num' | 'sans';
export type Align = 'l' | 'c' | 'r';

export type Op =
  | { k: 'rect'; x: number; y: number; w: number; h: number; fill: Ink }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; ink: Ink; a?: number }
  | {
      k: 'ring';
      cx: number; cy: number; r: number;
      a0: number; sweep: number;
      ink: Ink; lw: number; a?: number;
      /** Butt by default; a floor-length stub reads as a square without this. */
      cap?: 'butt' | 'round';
    }
  | { k: 'dot'; cx: number; cy: number; r: number; fill: Ink; a?: number }
  | { k: 'mark'; x: number; y: number; scale: number; ink: Ink }
  | {
      k: 'text';
      s: string; x: number; y: number; size: number;
      face: Face; ink: Ink; align: Align; track?: number; a?: number;
    };

/** ~5.2°, applied to the SWEEP so a 20-minute nap is still visible. */
export const MIN_SWEEP = 0.09;
/** Half the arc stroke expressed as an angle at radius R: the round-cap bleed. */
export const CAP_ANGLE = 13 / 344;
/** Midnight at the top, clockwise. */
export const theta = (min: number) => -Math.PI / 2 + (min / 1440) * Math.PI * 2;

const CX = 540;
/** Centred in the area the masthead leaves: (178 + 1350) / 2. */
const CY = 764;
const R = 344;

/** Fixed, never random: the same night must paint identically twice. All sit
 *  above the orbit, which now owns everything below the masthead rule. */
const STARS: [number, number, number, number][] = [
  [146, 104, 4.0, 0.3], [332, 168, 3.0, 0.18], [498, 92, 4.6, 0.34],
  [664, 196, 2.6, 0.16], [830, 120, 3.6, 0.24], [962, 232, 3.0, 0.2],
  [222, 288, 3.2, 0.2], [586, 306, 4.0, 0.22], [906, 340, 3.2, 0.18],
  [112, 300, 2.6, 0.12], [1006, 148, 2.8, 0.2], [58, 196, 3.0, 0.16],
];

export type Measure = (s: string, size: number, face: Face) => number;

/**
 * Canvas does not wrap. Step down the ladder, then ellipsize on CODE POINTS
 * (Array.from, so surrogate pairs survive intact).
 */
export function fitText(
  text: string,
  maxWidth: number,
  sizes: number[],
  face: Face,
  measure: Measure,
): { text: string; size: number } {
  for (const size of sizes) {
    if (measure(text, size, face) <= maxWidth) return { text, size };
  }
  const size = sizes[sizes.length - 1];
  let out = Array.from(text);
  while (out.length > 1 && measure(out.join('') + '…', size, face) > maxWidth) {
    out = out.slice(0, -1);
  }
  return { text: out.join('') + '…', size };
}

/** "7時間30分" / "7h 30m" → digit runs and unit runs, in order. */
function splitRuns(label: string): { s: string; digit: boolean }[] {
  const out: { s: string; digit: boolean }[] = [];
  for (const ch of Array.from(label)) {
    const digit = ch >= '0' && ch <= '9';
    const last = out[out.length - 1];
    if (last && last.digit === digit) last.s += ch;
    else out.push({ s: ch, digit });
  }
  return out;
}

export function buildCardOps(m: ShareCardModel, measure: Measure): Op[] {
  const ops: Op[] = [
    { k: 'rect', x: 0, y: 0, w: CARD_W, h: CARD_H, fill: 'ground' },
  ];

  for (const [x, y, r, a] of STARS) {
    ops.push({ k: 'dot', cx: x, cy: y, r, fill: 'lavender', a });
  }

  // ── masthead ──
  ops.push({ k: 'mark', x: 88, y: 84, scale: 0.56, ink: 'lavender' });
  ops.push({
    k: 'text', s: 'Madoromi', x: 176, y: 128, size: 42,
    face: 'display', ink: 'lavender', align: 'l', track: 0.22, a: 0.55,
  });
  ops.push({
    k: 'text', s: m.dateLabel, x: 992, y: 128, size: 34,
    face: 'num', ink: 'lavender', align: 'r', track: 0.06, a: 0.7,
  });
  ops.push({ k: 'line', x1: 88, y1: 178, x2: 992, y2: 178, ink: 'lavender', a: 0.14 });

  // ── the orbit ──
  ops.push({
    k: 'ring', cx: CX, cy: CY, r: R, a0: 0, sweep: Math.PI * 2,
    ink: 'lavender', lw: HAIRLINE, a: 0.14,
  });
  for (let h = 0; h < 24; h++) {
    const t = theta(h * 60);
    const major = h % 6 === 0;
    const inner = major ? R - 34 : R - 18;
    ops.push({
      k: 'line',
      x1: CX + R * Math.cos(t), y1: CY + R * Math.sin(t),
      x2: CX + inner * Math.cos(t), y2: CY + inner * Math.sin(t),
      ink: 'lavender', a: major ? 0.34 : 0.18,
    });
  }

  const a0 = theta(m.bedMin);
  const trueSweep = (m.sweepMin / 1440) * Math.PI * 2;
  const sweep = Math.max(trueSweep, MIN_SWEEP);
  // A nap at the visibility floor is ~27px of a 26px-wide stroke: with butt
  // caps that is a square, which reads as a rendering fault rather than a
  // short night. Round it into a lozenge instead — but a round cap paints
  // HALF A STROKE past each endpoint, which on a stub that short pushes the
  // violet clean past the mint dot and makes the marker read as the start of
  // the night. Inset the drawn range by that overshoot so the lozenge's
  // visible tips land exactly on a0 and a0 + sweep.
  const round = trueSweep <= MIN_SWEEP * 1.6;
  const cap = round ? CAP_ANGLE : 0;
  ops.push({
    k: 'ring',
    cx: CX, cy: CY, r: R,
    a0: a0 + cap,
    sweep: Math.max(sweep - cap * 2, 0.001),
    ink: 'arcInk', lw: 26,
    ...(round ? { cap: 'round' as const } : {}),
  });
  // The night's one semantic dose, and non-valenced: it marks where the night
  // ended, never whether it was any good.
  ops.push({
    k: 'dot',
    cx: CX + R * Math.cos(a0 + sweep),
    cy: CY + R * Math.sin(a0 + sweep),
    r: 13, fill: 'mint',
  });

  // ── the hero numeral: digits full size, units small, centred as one run ──
  const runs = splitRuns(m.durationLabel);
  const UNIT = 0.33;
  const MAXW = 508;
  const widthAt = (size: number) =>
    runs.reduce(
      (w, r) => w + measure(r.s, r.digit ? size : Math.round(size * UNIT), 'num'),
      0,
    );
  let heroSize = 148;
  for (const size of [190, 168, 148]) {
    if (widthAt(size) <= MAXW) {
      heroSize = size;
      break;
    }
  }
  let hx = CX - widthAt(heroSize) / 2;
  for (const r of runs) {
    const size = r.digit ? heroSize : Math.round(heroSize * UNIT);
    ops.push({
      k: 'text', s: r.s, x: hx, y: 800, size,
      face: 'num', ink: 'lavender', align: 'l', ...(r.digit ? {} : { a: 0.55 }),
    });
    hx += measure(r.s, size, 'num');
  }

  if (m.timesLabel) {
    ops.push({
      k: 'text', s: m.timesLabel, x: CX, y: 900, size: 40,
      face: 'num', ink: 'mist', align: 'c', a: 0.6,
    });
  }

  // No colophon, no slogan, no theme line. The eye and the wordmark in the
  // masthead are the whole signature; everything else on this card is data.
  return ops;
}
