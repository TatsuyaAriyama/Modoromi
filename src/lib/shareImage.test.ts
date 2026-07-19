import { describe, expect, it } from 'vitest';
import { chooseRoute, type ShareCaps } from './shareImage';

const caps = (over: Partial<ShareCaps> = {}): ShareCaps => ({
  hasBlob: true,
  canShareFiles: false,
  hasShare: false,
  native: false,
  ...over,
});

describe('chooseRoute', () => {
  it('fails when there is no image to share at all', () => {
    expect(chooseRoute(caps({ hasBlob: false, canShareFiles: true }))).toBe('failed');
  });

  it('prefers a real file share wherever it exists', () => {
    expect(chooseRoute(caps({ canShareFiles: true }))).toBe('files');
    expect(chooseRoute(caps({ canShareFiles: true, native: true }))).toBe('files');
  });

  it('falls back to long-press inside a native WebView, which has no downloads', () => {
    expect(chooseRoute(caps({ native: true, hasShare: true }))).toBe('longpress');
    expect(chooseRoute(caps({ native: true }))).toBe('longpress');
  });

  it('shares text on the web when files are unsupported', () => {
    expect(chooseRoute(caps({ hasShare: true }))).toBe('text');
  });

  it('downloads as the plain-browser last resort', () => {
    expect(chooseRoute(caps())).toBe('download');
  });
});
