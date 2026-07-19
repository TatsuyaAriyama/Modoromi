import { EYE_LASHES } from './eyeGeometry';

interface EyeMarkProps {
  /** false = closed eye (sleeping), true = open eye (awake). */
  open?: boolean;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Brand logo mark: the closed-eye / lashes motif from the app icon.
 * `open` morphs the lid to an open arc for the wake micro-interaction.
 */
export function EyeMark({
  open = false,
  size = 64,
  color = 'currentColor',
  className,
}: EyeMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'opacity 0.5s ease' }}
      >
        {/* Lid: closed = gentle downward arc; open = upper arc of an eye.
            `transition: d` is Safari 17.4+ and this ships to iOS 15, so the
            two arcs cross-fade instead — STAGGERED, never overlapping, or
            both would sit at half alpha mid-morph and read as a blur. */}
        <path
          d="M22 46 Q50 64 78 46"
          style={{
            opacity: open ? 0 : 1,
            transition: open
              ? 'opacity 0.22s var(--ease-rise)'
              : 'opacity 0.22s var(--ease-rise) 0.24s',
          }}
        />
        <path
          d="M22 50 Q50 28 78 50"
          style={{
            opacity: open ? 1 : 0,
            transition: open
              ? 'opacity 0.22s var(--ease-rise) 0.24s'
              : 'opacity 0.22s var(--ease-rise)',
          }}
        />
        {open ? (
          <circle cx="50" cy="52" r="9" fill={color} stroke="none" />
        ) : (
          <>
            {/* lashes — from the shared geometry above */}
            {EYE_LASHES.map(([x1, y1, x2, y2]) => (
              <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </>
        )}
      </g>
    </svg>
  );
}
