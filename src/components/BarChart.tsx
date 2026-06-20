import { useT } from '../i18n/useT';

export interface BarDatum {
  label: string;
  value: number; // minutes
}

/**
 * Lightweight hand-drawn SVG bar chart with an optional dotted target line.
 * No external chart deps.
 */
export function BarChart({
  data,
  target,
  height = 160,
  unitMax,
}: {
  data: BarDatum[];
  target?: number;
  height?: number;
  unitMax?: number;
}) {
  const t = useT();
  const W = 320;
  const H = height;
  const padB = 22;
  const padT = 8;
  const plotH = H - padB - padT;
  const maxVal = Math.max(unitMax ?? 0, target ?? 0, ...data.map((d) => d.value), 1);
  const n = Math.max(data.length, 1);
  const slot = W / n;
  const barW = Math.min(26, slot * 0.5);
  // Thin out x-axis labels so dense (monthly) views stay legible — render at
  // most one label per ~30px instead of overlapping every bar.
  const labelStep = Math.max(1, Math.ceil(30 / slot));

  const y = (v: number) => padT + plotH * (1 - v / maxVal);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('chart.duration')}
    >
      {target != null && (
        <g>
          <line
            x1={0}
            x2={W}
            y1={y(target)}
            y2={y(target)}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.8}
          />
        </g>
      )}
      {data.map((d, i) => {
        const cx = i * slot + slot / 2;
        const top = y(d.value);
        const h = Math.max(0, padT + plotH - top);
        return (
          <g key={i}>
            <rect
              x={cx - barW / 2}
              y={top}
              width={barW}
              height={h}
              rx={5}
              fill="var(--primary)"
              opacity={d.value > 0 ? 0.92 : 0.25}
            />
            {i % labelStep === 0 && (
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-mute)"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
