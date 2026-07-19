/**
 * The night sky as data. Pure and deterministic: same seed, same sky, every
 * render and every device — so the backdrop never reshuffles between paints,
 * which a real random field would do on every remount.
 *
 * This replaces a hand-typed table of 41 dots. That table read as dots on a
 * page rather than as a sky for two reasons, and both are structural rather
 * than cosmetic:
 *
 *   1. It was a scanline. x stepped ~70 and y stepped ~35, so the eye found
 *      the grid instantly. Real fields CLUMP — dense lanes and empty voids.
 *   2. Every star was the same species, r 0.7–1.3. With no brightness
 *      hierarchy there is nothing to look AT, so the field reads as texture
 *      noise instead of as depth.
 *
 * So: three tiers with real separation between them, density driven by a
 * galactic band plus a downward falloff, and blue-noise rejection so nothing
 * ever collides. Still flat circles and hairlines — no gradient, no glow, no
 * blur. The brightest stars get drawn diffraction spikes, which is how you
 * paint "bright" with a hairline instead of with a shadow.
 */

export type Tier = 'dust' | 'field' | 'beacon';

export interface Star {
  x: number;
  y: number;
  r: number;
  /** Resting opacity. The twinkle dips from this and returns to it. */
  o: number;
  tier: Tier;
  /** Present only on stars that breathe; seconds. */
  dur?: number;
  delay?: number;
}

export const SKY_W = 440;
export const SKY_H = 900;

/**
 * The galactic lane, upper-left to lower-right. Stars near this axis are far
 * likelier to be accepted, which is what gives the field its diagonal drift
 * and its empty corners.
 *
 * This diagonal and not the other one, for two reasons: it runs the same way
 * as the downward density falloff instead of fighting it, and it passes well
 * clear of the moon rings at (352, 142), so the top-right corner stays empty
 * enough for them to read.
 */
const BAND_A: [number, number] = [-40, 60];
const BAND_B: [number, number] = [480, 520];
const BAND_HALF = 172;

const TIERS: {
  tier: Tier;
  n: number;
  /** Radius and resting-opacity ranges; sampled per star. */
  r: [number, number];
  o: [number, number];
  /** Blue-noise spacing WITHIN this tier. Cross-tier is CLEAR, not this. */
  gap: number;
  /** Chance this tier's stars breathe. */
  twinkle: number;
}[] = [
  { tier: 'beacon', n: 5, r: [1.7, 2.2], o: [0.62, 0.8], gap: 132, twinkle: 1 },
  { tier: 'field', n: 24, r: [0.95, 1.35], o: [0.3, 0.5], gap: 40, twinkle: 0.4 },
  { tier: 'dust', n: 74, r: [0.45, 0.72], o: [0.1, 0.24], gap: 17, twinkle: 0 },
];

/**
 * Minimum distance between stars of DIFFERENT tiers — just enough that nothing
 * touches, including a beacon's spikes at r * 5.5.
 *
 * This is deliberately not the larger of the two tiers' own gaps. Taking the
 * max would let a beacon's 132-unit separation carve a 132-radius void out of
 * the dust around it; five of those is more than half the backdrop, and the
 * dust it displaced piled up at the bottom of the screen. Beacons need to be
 * far from EACH OTHER, not surrounded by emptiness.
 */
const CLEAR = 15;

/** Numerical Recipes LCG. Small, seeded, and identical on every engine. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Perpendicular distance from a point to the infinite galactic axis. */
function bandDistance(x: number, y: number): number {
  const dx = BAND_B[0] - BAND_A[0];
  const dy = BAND_B[1] - BAND_A[1];
  const cross = Math.abs((x - BAND_A[0]) * dy - (y - BAND_A[1]) * dx);
  return cross / Math.hypot(dx, dy);
}

/**
 * How willing the sky is to accept a star here, in 0..1. Thins toward the
 * bottom so the top of the screen reads as sky and the bottom stays quiet
 * behind the controls, and thickens along the galactic lane.
 */
export function density(x: number, y: number): number {
  const falloff = 1 - 0.8 * (y / SKY_H) ** 0.62;
  const band = Math.max(0, 1 - bandDistance(x, y) / BAND_HALF) ** 2;
  return Math.min(1, Math.max(0, falloff * (0.34 + 0.66 * band)));
}

export function buildStarfield(seed = 0x5b48c8): Star[] {
  const rand = lcg(seed);
  const out: Star[] = [];

  for (const spec of TIERS) {
    let placed = 0;
    // Hard attempt cap: rejection sampling must terminate even if the spacing
    // and the count are ever set to something unsatisfiable.
    for (let tries = 0; tries < 6000 && placed < spec.n; tries++) {
      const x = rand() * SKY_W;
      const y = rand() * SKY_H;
      if (rand() > density(x, y)) continue;

      const tooClose = out.some((s) => {
        const gap = s.tier === spec.tier ? spec.gap : CLEAR;
        return Math.hypot(s.x - x, s.y - y) < gap;
      });
      if (tooClose) continue;

      const star: Star = {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        r: Math.round((spec.r[0] + rand() * (spec.r[1] - spec.r[0])) * 100) / 100,
        o: Math.round((spec.o[0] + rand() * (spec.o[1] - spec.o[0])) * 100) / 100,
        tier: spec.tier,
      };
      // Every breathing star gets its OWN period and phase. Sharing one
      // duration is what made the old field pulse in lockstep, which reads as
      // a mechanism rather than as a sky.
      if (rand() < spec.twinkle) {
        star.dur = Math.round((5.5 + rand() * 5.5) * 10) / 10;
        star.delay = Math.round(rand() * 90) / 10;
      }
      out.push(star);
      placed++;
    }
  }
  return out;
}
