import { memo, type CSSProperties } from 'react';
import './nightsky.css';

/**
 * Ambient backdrop: a faint scattering of stars and two large moon rings that
 * bleed off the right edge. Flat shapes only — texture, never a gradient wash.
 * Purely decorative, so it sits behind everything and is hidden from AT.
 *
 * Star positions are a fixed table (not random) so the sky never reshuffles
 * between renders.
 */

// [x, y, radius, opacity] in the 440 × 900 backdrop space, thinning downward
// so the top of the screen reads as sky and the bottom stays quiet.
const STARS: [number, number, number, number][] = [
  [28, 54, 1.1, 0.5], [96, 22, 0.7, 0.3], [148, 88, 1.3, 0.55],
  [212, 40, 0.8, 0.35], [268, 106, 1.0, 0.45], [332, 30, 1.2, 0.5],
  [396, 76, 0.7, 0.3], [62, 132, 0.9, 0.4], [178, 156, 0.7, 0.28],
  [246, 182, 1.1, 0.42], [304, 148, 0.8, 0.32], [412, 168, 1.0, 0.38],
  [20, 208, 0.8, 0.3], [124, 232, 1.2, 0.4], [196, 268, 0.7, 0.25],
  [286, 244, 0.9, 0.33], [368, 292, 1.1, 0.36], [54, 306, 0.7, 0.24],
  [148, 344, 0.9, 0.3], [232, 372, 0.7, 0.22], [318, 356, 1.0, 0.3],
  [408, 404, 0.8, 0.24], [34, 396, 1.0, 0.28], [116, 448, 0.7, 0.2],
  [204, 470, 0.9, 0.24], [292, 434, 0.7, 0.2], [376, 496, 0.8, 0.22],
  [70, 512, 0.8, 0.2], [166, 556, 0.7, 0.18], [258, 588, 0.9, 0.2],
  [344, 552, 0.7, 0.16], [420, 604, 0.8, 0.18], [42, 628, 0.7, 0.16],
  [132, 668, 0.8, 0.16], [224, 704, 0.7, 0.14], [312, 660, 0.8, 0.15],
  [398, 726, 0.7, 0.13], [88, 754, 0.7, 0.12], [268, 800, 0.8, 0.12],
  [356, 842, 0.7, 0.1],
];

// A few of the brighter stars breathe, on staggered cycles.
const TWINKLE = new Set([2, 5, 9, 13, 17, 24]);

/* memo: NightSky takes no props, and its parents (SessionScreen, NapScreen,
   WindDownScreen) re-render on a timer. Without this, 43 SVG nodes reconcile
   every second all night long. */
export const NightSky = memo(function NightSky() {
  return (
    <svg
      className="night-sky"
      viewBox="0 0 440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Moon rings, bleeding off the top-right corner. */}
      <circle cx="392" cy="150" r="128" className="sky-ring" />
      <circle cx="392" cy="150" r="196" className="sky-ring sky-ring-outer" />
      {STARS.map(([cx, cy, r, o], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          className={TWINKLE.has(i) ? 'sky-star sky-star-twinkle' : 'sky-star'}
          {...(TWINKLE.has(i) ? { 'data-ambient': '' } : {})}
          style={
            {
              '--o': o,
              ...(TWINKLE.has(i)
                ? { animationDelay: `${(i % 6) * 1.3}s` }
                : {}),
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
});
