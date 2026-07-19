import { describe, expect, it } from 'vitest';
import { LANGS, messages, translate } from './catalog';

/**
 * Keys the app builds at runtime from a domain value (`t(\`cond.${tier}\`)`),
 * so a typo or a deleted entry is invisible to TypeScript and only shows up
 * as a raw key on screen.
 */
const RUNTIME_KEYS = [
  ...['none', 'onTarget', 'slightlyShort', 'wellShort', 'qualityUp', 'qualityFlat', 'qualityDown'].map(
    (k) => `review.${k}`,
  ),
  ...['idealRecover', 'idealRefresh', 'caution', 'nightFirst', 'morningLight'].map(
    (k) => `nap.${k}`,
  ),
  ...['duration-quality', 'weekend-drift', 'stillness-quality', 'rhythm-quality'].map(
    (k) => `insight.${k}`,
  ),
  ...['sharp', 'steady', 'foggy', 'depleted'].flatMap((k) => [
    `cond.${k}`,
    `cond.${k}Copy`,
  ]),
  ...['high', 'medium', 'low'].map((k) => `reg.${k}`),
  ...['inhale', 'hold-in', 'exhale', 'hold-out'].map((k) => `breath.${k}`),
  ...['fresh', 'normal', 'groggy'].map((k) => `mood.${k}`),
  ...['auto', 'day', 'night'].map((k) => `theme.${k}`),
  ...['still', 'calm', 'restless'].map((k) => `motion.${k}`),
];

describe('catalog', () => {
  it('pluralizes English movement counts', () => {
    expect(translate('en', 'motion.count', { count: 1 })).toBe('1 movement');
    expect(translate('en', 'motion.count', { count: 2 })).toBe('2 movements');
    expect(translate('en', 'motion.count', { count: 0 })).toBe('0 movements');
    expect(translate('en', 'morning.movements', { count: 1 })).toBe('1 movement');
  });

  it.each(RUNTIME_KEYS)('%s resolves in every language', (key) => {
    expect(messages[key], `missing catalog entry for ${key}`).toBeDefined();
    for (const { id } of LANGS) {
      const out = translate(id, key, { diff: 12, amount: '30m', count: 3 });
      // translate() falls back to the raw key on a miss.
      expect(out).not.toBe(key);
      expect(out).not.toMatch(/undefined|NaN/);
      expect(out.trim().length).toBeGreaterThan(0);
    }
  });

  it('defines both languages for every entry', () => {
    for (const [key, msg] of Object.entries(messages)) {
      expect(msg.en, `${key} is missing en`).toBeDefined();
      expect(msg.ja, `${key} is missing ja`).toBeDefined();
    }
  });
});
