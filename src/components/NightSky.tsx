import { memo, type CSSProperties } from 'react';
import './nightsky.css';
import { SKY_H, SKY_W, buildStarfield, type Star } from './starfield';

/**
 * Ambient backdrop: a deterministic starfield and a set of moon rings that
 * bleed off the top-right corner. Flat shapes only — texture, never a gradient
 * wash. Purely decorative, so it sits behind everything and is hidden from AT.
 *
 * The field itself lives in starfield.ts; this file only knows how to put it
 * on screen. It is built once at module load, not per render — it is the same
 * sky every time by construction, so recomputing it would be pure waste.
 */

const STARS = buildStarfield();

/**
 * A beacon is drawn bright with HAIRLINES, not with a glow: two crossed
 * strokes reading as diffraction spikes. A shadow or a blur would say the
 * same thing and break the flat grammar the rest of the app holds to.
 */
function Beacon({ s }: { s: Star }) {
  // The horizontal arm runs longer than the vertical. Equal arms read as a
  // plus sign; unequal ones read as optical flare.
  const h = s.r * 6.4;
  const v = s.r * 4.6;
  return (
    <g
      className={s.dur ? 'sky-beacon sky-twinkle' : 'sky-beacon'}
      {...(s.dur ? { 'data-ambient': '' } : {})}
      style={
        {
          '--o': s.o,
          ...(s.dur
            ? { '--tw-dur': `${s.dur}s`, animationDelay: `${s.delay}s` }
            : {}),
        } as CSSProperties
      }
    >
      <line x1={s.x - h} y1={s.y} x2={s.x + h} y2={s.y} />
      <line x1={s.x} y1={s.y - v} x2={s.x} y2={s.y + v} />
      <circle cx={s.x} cy={s.y} r={s.r} />
    </g>
  );
}

/* memo: NightSky takes no props, and its parents (SessionScreen, NapScreen,
   WindDownScreen) re-render on a timer. Without this the whole field
   reconciles every second all night long. */
export const NightSky = memo(function NightSky() {
  return (
    <svg
      className="night-sky"
      viewBox={`0 0 ${SKY_W} ${SKY_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Moon rings: three radii in near-geometric steps, so they read as a
          considered set rather than as a doubled line. The centre sits at 352
          rather than at the old 392 because `slice` crops ~13 units off each
          side on a 390pt screen — at 392 the innermost ring fell almost
          entirely off the edge and read as a stray arc instead of as a moon.
          The two outer rings still bleed off, which is the intent. */}
      <circle cx="352" cy="142" r="66" className="sky-ring sky-ring-inner" />
      <circle cx="352" cy="142" r="124" className="sky-ring" />
      <circle cx="352" cy="142" r="190" className="sky-ring sky-ring-outer" />

      {STARS.map((s, i) =>
        s.tier === 'beacon' ? (
          <Beacon key={i} s={s} />
        ) : (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            className={s.dur ? 'sky-star sky-twinkle' : 'sky-star'}
            {...(s.dur ? { 'data-ambient': '' } : {})}
            style={
              {
                '--o': s.o,
                ...(s.dur
                  ? { '--tw-dur': `${s.dur}s`, animationDelay: `${s.delay}s` }
                  : {}),
              } as CSSProperties
            }
          />
        ),
      )}
    </svg>
  );
});
