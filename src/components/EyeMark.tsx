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
        {/* Lid: closed = gentle downward arc; open = upper arc of an eye. */}
        <path
          d={
            open
              ? 'M22 50 Q50 28 78 50'
              : 'M22 46 Q50 64 78 46'
          }
          style={{ transition: 'd 0.5s ease' }}
        />
        {open ? (
          <circle cx="50" cy="52" r="9" fill={color} stroke="none" />
        ) : (
          <>
            {/* lashes */}
            <line x1="20" y1="48" x2="14" y2="56" />
            <line x1="34" y1="58" x2="31" y2="68" />
            <line x1="50" y1="62" x2="50" y2="73" />
            <line x1="66" y1="58" x2="69" y2="68" />
            <line x1="80" y1="48" x2="86" y2="56" />
          </>
        )}
      </g>
    </svg>
  );
}
