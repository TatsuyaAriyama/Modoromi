import type { ScheduleDay } from '../domain/schedule';
import { useT } from '../i18n/useT';

/**
 * Sleep-rhythm chart: one rounded bar per day spanning bedtime → wake on an
 * evening-anchored axis (18:00 at the top, noon next day at the bottom).
 * Same hand-drawn SVG language as the other charts.
 */
export function ScheduleChart({
  data,
  height = 170,
}: {
  data: ScheduleDay[];
  height?: number;
}) {
  const t = useT();
  const W = 320;
  const H = height;
  const padB = 22;
  const padT = 8;
  const padX = 26; // room for the hour labels on the left
  const plotH = H - padB - padT;
  const plotW = W - padX - 8;
  // Axis: 20:00 (em 120) → 10:00 next day (em 960).
  const EM_MIN = 120;
  const EM_MAX = 960;
  const n = Math.max(data.length, 1);

  const x = (i: number) => padX + (plotW * (i + 0.5)) / n;
  const y = (em: number) =>
    padT +
    plotH *
      ((Math.min(EM_MAX, Math.max(EM_MIN, em)) - EM_MIN) / (EM_MAX - EM_MIN));
  const barW = Math.min(10, (plotW / n) * 0.5);
  const labelStep = Math.max(1, Math.ceil((30 * (n - 1)) / Math.max(plotW, 1)));

  // Gridlines at midnight and 06:00 (em 360 / 720).
  const grid: { em: number; label: string }[] = [
    { em: 360, label: '0:00' },
    { em: 720, label: '6:00' },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('chart.schedule')}
    >
      {grid.map((g) => (
        <g key={g.em}>
          <line
            x1={padX}
            x2={W - 8}
            y1={y(g.em)}
            y2={y(g.em)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={padX - 4}
            y={y(g.em) + 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--text-mute)"
          >
            {g.label}
          </text>
        </g>
      ))}
      {data.map((d, i) =>
        d.bedEm == null || d.wakeEm == null ? null : (
          <rect
            key={d.key}
            x={x(i) - barW / 2}
            y={y(d.bedEm)}
            width={barW}
            height={Math.max(3, y(d.wakeEm) - y(d.bedEm))}
            rx={barW / 2}
            fill="var(--primary)"
            opacity={0.75}
          />
        ),
      )}
      {data.map((d, i) =>
        i % labelStep === 0 ? (
          <text
            key={`l${d.key}`}
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
