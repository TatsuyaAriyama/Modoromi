import { isNative } from './platform';

/**
 * Capability routing for getting a rendered card off the device, with no
 * dependency on a share plugin.
 *
 * The chain matters more than any one branch: a Capacitor WebView has no
 * download manager and no share sheet unless the Web Share API is present, so
 * the honest last resort there is telling the user to press and hold the image
 * — which works on an <img> and never on a <canvas>. That is why the preview
 * is an <img> of the exported PNG rather than the canvas itself.
 */

export type ShareRoute = 'files' | 'text' | 'download' | 'longpress' | 'failed';

export interface ShareCaps {
  hasBlob: boolean;
  canShareFiles: boolean;
  hasShare: boolean;
  native: boolean;
}

/** The one part of the chain worth pinning in a test. */
export function chooseRoute(c: ShareCaps): ShareRoute {
  if (!c.hasBlob) return 'failed';
  if (c.canShareFiles) return 'files';
  // A native WebView with no file sharing has nowhere to download to.
  if (c.native) return 'longpress';
  if (c.hasShare) return 'text';
  return 'download';
}

export function shareCaps(file: File | null): ShareCaps {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  let canShareFiles = false;
  try {
    canShareFiles =
      !!file && !!nav.share && !!nav.canShare && nav.canShare({ files: [file] });
  } catch {
    // Safari throws rather than returning false for some shapes.
  }
  return {
    hasBlob: !!file,
    canShareFiles,
    hasShare: typeof nav.share === 'function',
    native: isNative(),
  };
}

/**
 * MUST be called from a click handler with `file` ALREADY rendered. iOS drops
 * the transient user-activation token across a long await, after which share()
 * rejects with NotAllowedError — a silent failure. Never move rendering in here.
 *
 * AbortError is the user closing the share sheet, which is not an error.
 */
export async function performShare(
  route: ShareRoute,
  file: File | null,
  text: string,
): Promise<'ok' | 'cancelled' | 'no'> {
  try {
    if (route === 'files' && file) {
      await navigator.share({ files: [file], text });
      return 'ok';
    }
    if (route === 'text') {
      await navigator.share({ text });
      return 'ok';
    }
    if (route === 'download' && file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return 'ok';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
  }
  return 'no';
}
