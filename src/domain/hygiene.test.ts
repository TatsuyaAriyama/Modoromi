import { describe, expect, it } from 'vitest';
import {
  CAFFEINE_LEAD_MIN,
  SCREEN_WARM_LEAD_MIN,
  hygieneCues,
} from './hygiene';

describe('hygieneCues', () => {
  it('sets caffeine cutoff 8h and screen warmth 90m before bedtime', () => {
    const cues = hygieneCues('23:30');
    expect(cues.caffeineCutoffHm).toBe('15:30'); // 23:30 − 8h
    expect(cues.screenWarmHm).toBe('22:00'); // 23:30 − 90m
  });

  it('wraps across midnight for an early bedtime', () => {
    const cues = hygieneCues('00:30');
    expect(cues.caffeineCutoffHm).toBe('16:30'); // 00:30 − 8h → 16:30 prev
    expect(cues.screenWarmHm).toBe('23:00');
  });

  it('matches the documented lead constants', () => {
    expect(CAFFEINE_LEAD_MIN).toBe(480);
    expect(SCREEN_WARM_LEAD_MIN).toBe(90);
  });
});
