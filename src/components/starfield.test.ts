import { describe, expect, it } from 'vitest';
import { SKY_H, SKY_W, buildStarfield, density, type Star } from './starfield';

const field = buildStarfield();
const of = (t: Star['tier']) => field.filter((s) => s.tier === t);

describe('buildStarfield', () => {
  it('is deterministic — the sky never reshuffles between renders', () => {
    expect(buildStarfield()).toEqual(buildStarfield());
  });

  it('gives a different seed a different sky', () => {
    expect(buildStarfield(1)).not.toEqual(buildStarfield(2));
  });

  it('places every star inside the backdrop, with finite geometry', () => {
    for (const s of field) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(SKY_W);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(SKY_H);
      expect(Number.isFinite(s.r)).toBe(true);
      expect(s.r).toBeGreaterThan(0);
      expect(s.o).toBeGreaterThan(0);
      expect(s.o).toBeLessThanOrEqual(1);
    }
  });

  it('fills every tier — rejection sampling must not starve', () => {
    expect(of('beacon')).toHaveLength(5);
    expect(of('field')).toHaveLength(24);
    expect(of('dust')).toHaveLength(74);
  });

  it('separates the tiers by brightness, so the field has a hierarchy', () => {
    // The old hand-typed table ran 0.7–1.3 across the board, which is why it
    // read as noise: nothing stood out to look at.
    const maxOf = (t: Star['tier']) => Math.max(...of(t).map((s) => s.r));
    const minOf = (t: Star['tier']) => Math.min(...of(t).map((s) => s.r));
    expect(maxOf('dust')).toBeLessThan(minOf('field'));
    expect(maxOf('field')).toBeLessThan(minOf('beacon'));
  });

  it('never lets two stars collide', () => {
    for (let i = 0; i < field.length; i++) {
      for (let j = i + 1; j < field.length; j++) {
        const d = Math.hypot(field[i].x - field[j].x, field[i].y - field[j].y);
        expect(d).toBeGreaterThan(field[i].r + field[j].r);
      }
    }
  });

  it('spaces the beacons far apart so they never read as a pair', () => {
    const b = of('beacon');
    for (let i = 0; i < b.length; i++) {
      for (let j = i + 1; j < b.length; j++) {
        expect(Math.hypot(b[i].x - b[j].x, b[i].y - b[j].y)).toBeGreaterThan(130);
      }
    }
  });

  it('thins downward, keeping the bottom quiet behind the controls', () => {
    const top = field.filter((s) => s.y < SKY_H / 2).length;
    const bottom = field.length - top;
    expect(top).toBeGreaterThan(bottom * 1.5);
  });

  it('clumps along the galactic lane instead of gridding', () => {
    // A scanline table has near-identical spacing everywhere. A real field has
    // dense lanes and voids, so nearest-neighbour distances must VARY.
    const nn = field.map((a) =>
      Math.min(
        ...field
          .filter((b) => b !== a)
          .map((b) => Math.hypot(a.x - b.x, a.y - b.y)),
      ),
    );
    const mean = nn.reduce((x, y) => x + y, 0) / nn.length;
    const sd = Math.sqrt(
      nn.reduce((x, d) => x + (d - mean) ** 2, 0) / nn.length,
    );
    expect(sd / mean).toBeGreaterThan(0.3);
  });

  it('gives every breathing star its own period and phase', () => {
    const tw = field.filter((s) => s.dur != null);
    expect(tw.length).toBeGreaterThan(5);
    for (const s of tw) {
      expect(s.dur).toBeGreaterThanOrEqual(5.5);
      expect(s.dur).toBeLessThanOrEqual(11);
      expect(s.delay).toBeGreaterThanOrEqual(0);
    }
    // The old field shared one duration across six stars, which pulsed in
    // lockstep and read as a mechanism.
    expect(new Set(tw.map((s) => `${s.dur}/${s.delay}`)).size).toBe(tw.length);
  });

  it('leaves the dust still — 60 animated nodes would cost more than it buys', () => {
    expect(of('dust').every((s) => s.dur == null)).toBe(true);
    expect(of('beacon').every((s) => s.dur != null)).toBe(true);
  });
});

describe('density', () => {
  it('is brightest on the lane and dimmest far from it', () => {
    // Both points sit at the same height, so only the lane can separate them.
    expect(density(200, 309)).toBeGreaterThan(density(430, 309));
  });

  it('keeps the moon\u2019s corner clear enough for the rings to read', () => {
    expect(density(352, 142)).toBeLessThan(density(150, 150));
  });

  it('stays in range across the whole backdrop', () => {
    for (let x = 0; x <= SKY_W; x += 20) {
      for (let y = 0; y <= SKY_H; y += 20) {
        const d = density(x, y);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('the field as composed', () => {
  it('keeps a thin scatter all the way down, rather than stopping', () => {
    // Quiet at the bottom, not bare: an empty lower third reads as the field
    // having run out rather than as sky.
    const bands = [0, 1, 2, 3].map(
      (b) =>
        buildStarfield().filter(
          (s) => s.y >= (b * SKY_H) / 4 && s.y < ((b + 1) * SKY_H) / 4,
        ).length,
    );
    for (const n of bands) expect(n).toBeGreaterThanOrEqual(8);
    // ...and still clearly denser at the top than at the bottom.
    expect(bands[0]).toBeGreaterThan(bands[3]);
  });
});
