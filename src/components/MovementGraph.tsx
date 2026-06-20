import { useT } from '../i18n/useT';

/**
 * Small SVG sparkline of body-movement counts across a night, oldest → newest.
 * Shares the hand-drawn, dependency-free style of BarChart/LineChart. Empty
 * slices render as faint baseline ticks so the whole night reads as a shape.
 */
export function MovementGraph({
  bins,
  height = 64,
}: {
  bins: number[];
  height?: number;
}) {
  const t = useT();
  const W = 320;
  const H = height;
  const padB = 4;
  const padT = 6;
  const plotH = H - padB - padT;
  const baseline = padT + plotH;
  const max = Math.max(1, ...bins);
  const n = Math.max(bins.length, 1);
  const slot = W / n;
  const barW = Math.min(18, slot * 0.6);
  const y = (v: number) => padT + plotH * (1 - v / max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('chart.movement')}
    >
      {bins.map((v, i) => {
        const cx = i * slot + slot / 2;
        const top = v > 0 ? y(v) : baseline - 1;
        const h = v > 0 ? Math.max(2, baseline - top) : 1;
        return (
          <rect
            key={i}
            x={cx - barW / 2}
            y={top}
            width={barW}
            height={h}
            rx={3}
            fill="var(--primary)"
            opacity={v > 0 ? 0.9 : 0.18}
          />
        );
      })}
    </svg>
  );
}
