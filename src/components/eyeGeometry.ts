/**
 * The brand mark's geometry, in its own module so both renderers can import it
 * without EyeMark.tsx exporting non-components (which breaks fast refresh).
 *
 * The share card paints this on a canvas and the app renders it as SVG; one
 * table means the two cannot drift apart.
 */
export const EYE_STROKE = 6;

export const EYE_LID_CLOSED = 'M22 46 Q50 64 78 46';

export const EYE_LASHES: readonly [number, number, number, number][] = [
  [20, 48, 14, 56],
  [34, 58, 31, 68],
  [50, 62, 50, 73],
  [66, 58, 69, 68],
  [80, 48, 86, 56],
];

export const EYE_CLOSED_PATHS = [
  EYE_LID_CLOSED,
  ...EYE_LASHES.map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`),
];
