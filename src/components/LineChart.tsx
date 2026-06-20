import { useT } from '../i18n/useT';

export interface LinePoint {
  label: string;
  value: number | null; // 0–100 quality score, null = no data
}

/** Hand-drawn SVG line chart for a 0–100 trend (quality, condition, …). */
export function LineChart({
  data,
  height = 160,
  ariaLabel,
}: {
  data: LinePoint[];
  height?: number;
  ariaLabel?: string;
}) {
  const t = useT();
  const W = 320;
  const H = height;
  const padB = 22;
  const padT = 8;
  const padX = 8;
  const plotH = H - padB - padT;
  const plotW = W - padX * 2;
  const n = Math.max(data.length, 1);
  // Thin out x-axis labels so dense (monthly) views stay legible.
  const labelStep = Math.max(1, Math.ceil((30 * (n - 1)) / Math.max(plotW, 1)));

  const x = (i: number) =>
    padX + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => padT + plotH * (1 - v / 100);

  const pts = data
    .map((d, i) => (d.value == null ? null : { x: x(i), y: y(d.value) }))
    .filter((p): p is { x: number; y: number } => p !== null);

  const path =
    pts.length > 0
      ? pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' ')
      : '';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel ?? t('chart.quality')}
    >
      {[0, 50, 100].map((g) => (
        <line
          key={g}
          x1={padX}
          x2={W - padX}
          y1={y(g)}
          y2={y(g)}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {path && (
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {data.map((d, i) =>
        d.value == null ? null : (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.value)}
            r={3.5}
            fill="var(--primary)"
          />
        ),
      )}
      {data.map((d, i) =>
        i % labelStep === 0 ? (
          <text
            key={`l${i}`}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="var(--text-mute)"
          >
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
