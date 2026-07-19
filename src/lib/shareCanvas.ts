import {
  CARD_H,
  CARD_W,
  HAIRLINE,
  buildCardOps,
  type Face,
  type Ink,
  type LayoutText,
  type Measure,
  type Op,
} from '../domain/shareCardLayout';
import type { ShareCardModel } from '../domain/shareCard';
import { EYE_CLOSED_PATHS, EYE_STROKE } from '../components/eyeGeometry';

/**
 * The canvas sink: a thin painter for the pure op list. All the decisions live
 * in shareCardLayout; this file only knows how to put them on a surface.
 *
 * Colours are literal hex, never read from getComputedStyle — the sleep theme
 * dims the whole app, and an exported image must not inherit that.
 */

const INK: Record<Ink, string> = {
  ground: '#0a0712',
  plane: '#5b48c8',
  arcInk: '#6d5ae0',
  lavender: '#cfc6f4',
  mist: '#f3f0fb',
  mint: '#a8e6c8',
};

/** Byte-identical to the --font-* stacks in tokens.css. Weight never over 500. */
const FACE: Record<Face, (px: number) => string> = {
  display: (px) =>
    `500 ${px}px "Hiragino Mincho ProN","Hiragino Mincho Pro","YuMincho","Yu Mincho","Noto Serif JP",serif`,
  num: (px) =>
    `400 ${px}px "SF Mono","SFMono-Regular",ui-monospace,"Menlo",monospace`,
  sans: (px) =>
    `400 ${px}px "Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif`,
};

export const measureWith =
  (ctx: CanvasRenderingContext2D): Measure =>
  (s, size, face) => {
    ctx.font = FACE[face](size);
    return ctx.measureText(s).width;
  };

/** Canvas has no letter-spacing on iOS 15, so tracking is drawn glyph by glyph. */
function drawRun(ctx: CanvasRenderingContext2D, o: Extract<Op, { k: 'text' }>) {
  const chars = Array.from(o.s);
  const track = (o.track ?? 0) * o.size;
  const total =
    chars.reduce((a, c) => a + ctx.measureText(c).width, 0) +
    track * Math.max(chars.length - 1, 0);
  let x = o.align === 'c' ? o.x - total / 2 : o.align === 'r' ? o.x - total : o.x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const c of chars) {
    ctx.fillText(c, x, o.y);
    x += ctx.measureText(c).width + track;
  }
}

export function paintOps(
  ctx: CanvasRenderingContext2D,
  ops: Op[],
  scale = 1,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  for (const o of ops) {
    ctx.globalAlpha = 'a' in o && o.a != null ? o.a : 1;
    switch (o.k) {
      case 'rect':
        ctx.fillStyle = INK[o.fill];
        ctx.fillRect(o.x, o.y, o.w, o.h);
        break;
      case 'line':
        ctx.strokeStyle = INK[o.ink];
        ctx.lineWidth = HAIRLINE;
        ctx.beginPath();
        ctx.moveTo(o.x1, o.y1);
        ctx.lineTo(o.x2, o.y2);
        ctx.stroke();
        break;
      case 'ring':
        ctx.strokeStyle = INK[o.ink];
        ctx.lineWidth = o.lw;
        // Butt by default: a round cap overshoots the endpoint and grows a
        // violet tail out of the mint dot. The layout opts a floor-length
        // stub into 'round', where the square would look like a fault.
        ctx.lineCap = o.cap ?? 'butt';
        ctx.beginPath();
        ctx.arc(o.cx, o.cy, o.r, o.a0, o.a0 + o.sweep, false);
        ctx.stroke();
        break;
      case 'dot':
        ctx.fillStyle = INK[o.fill];
        ctx.beginPath();
        ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'mark': {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.scale(o.scale, o.scale);
        ctx.strokeStyle = INK[o.ink];
        ctx.lineWidth = EYE_STROKE;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const d of EYE_CLOSED_PATHS) ctx.stroke(new Path2D(d));
        ctx.restore();
        break;
      }
      case 'text':
        ctx.font = FACE[o.face](o.size);
        ctx.fillStyle = INK[o.ink];
        drawRun(ctx, o);
        break;
    }
  }
  ctx.restore();
}

/**
 * Render the card to a PNG blob. Returns null on ANY failure — jsdom (no
 * canvas), a refused buffer, a null toBlob — and never throws, so the caller
 * has exactly one branch to handle.
 */
export async function renderCardPng(
  model: ShareCardModel,
  txt: LayoutText,
): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.toBlob !== 'function') return null;
    // Without this the first paint can land in a fallback face.
    try {
      await document.fonts?.ready;
    } catch {
      /* no FontFaceSet on this engine */
    }
    paintOps(ctx, buildCardOps(model, txt, measureWith(ctx)), 1);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
  } catch {
    return null;
  }
}
