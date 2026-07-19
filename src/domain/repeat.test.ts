import { describe, expect, it } from 'vitest';
import { repeatPhrase } from './repeat';

describe('repeatPhrase', () => {
  it('names the shape rather than listing the days', () => {
    expect(repeatPhrase([], 'en')).toBe('Once');
    expect(repeatPhrase([0, 1, 2, 3, 4, 5, 6], 'en')).toBe('Every day');
    expect(repeatPhrase([1, 2, 3, 4, 5], 'en')).toBe('Weekdays');
    expect(repeatPhrase([0, 6], 'en')).toBe('Weekends');
  });

  it('recognises a shape regardless of the stored order', () => {
    expect(repeatPhrase([5, 1, 3, 2, 4], 'en')).toBe('Weekdays');
    expect(repeatPhrase([6, 0], 'ja')).toBe('土日');
  });

  it('enumerates only an irregular set, with a language-appropriate separator', () => {
    expect(repeatPhrase([1, 3, 5], 'en')).toBe('Mon, Wed, Fri');
    expect(repeatPhrase([1, 3, 5], 'ja')).toBe('月・水・金');
  });

  it('speaks Japanese shapes', () => {
    expect(repeatPhrase([], 'ja')).toBe('次回のみ');
    expect(repeatPhrase([1, 2, 3, 4, 5], 'ja')).toBe('平日');
  });
});
