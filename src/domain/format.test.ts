import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDuration,
  formatDurationShort,
  isoToHm,
  parseHm,
  subtractMinutesHm,
  weekdayName,
} from './format';

describe('formatDuration (en)', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(450, 'en')).toBe('7h 30m');
  });
  it('drops the minute part on the hour', () => {
    expect(formatDuration(420, 'en')).toBe('7h');
  });
  it('drops the hour part under an hour', () => {
    expect(formatDuration(30, 'en')).toBe('30m');
    expect(formatDuration(0, 'en')).toBe('0m');
  });
  it('carries a leading sign for negatives', () => {
    expect(formatDuration(-450, 'en')).toBe('-7h 30m');
    expect(formatDuration(-30, 'en')).toBe('-30m');
  });
});

describe('formatDuration (ja)', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(450, 'ja')).toBe('7時間30分');
  });
  it('drops the minute part on the hour', () => {
    expect(formatDuration(420, 'ja')).toBe('7時間');
  });
  it('drops the hour part under an hour', () => {
    expect(formatDuration(30, 'ja')).toBe('30分');
    expect(formatDuration(0, 'ja')).toBe('0分');
  });
  it('carries a leading sign for negatives', () => {
    expect(formatDuration(-450, 'ja')).toBe('-7時間30分');
    expect(formatDuration(-30, 'ja')).toBe('-30分');
  });
});

describe('formatDurationShort', () => {
  it('uses compact h/m units', () => {
    expect(formatDurationShort(450)).toBe('7h30m');
    expect(formatDurationShort(420)).toBe('7h');
  });
});

describe('isoToHm', () => {
  it('formats local hours:minutes from an ISO date', () => {
    const iso = new Date(2026, 5, 20, 6, 5).toISOString();
    expect(isoToHm(iso)).toBe('06:05');
  });
});

describe('parseHm', () => {
  it('parses an HH:mm pair', () => {
    expect(parseHm('07:30')).toEqual({ hour: 7, minute: 30 });
  });
  it('defaults missing pieces to zero', () => {
    expect(parseHm('')).toEqual({ hour: 0, minute: 0 });
  });
});

describe('subtractMinutesHm', () => {
  it('subtracts within the day', () => {
    expect(subtractMinutesHm('07:00', 450)).toBe('23:30');
  });
  it('wraps backward across midnight', () => {
    expect(subtractMinutesHm('00:30', 60)).toBe('23:30');
  });
  it('is identity for zero', () => {
    expect(subtractMinutesHm('07:00', 0)).toBe('07:00');
  });
});

describe('weekdayName', () => {
  it('maps the week (en)', () => {
    expect(weekdayName(0, 'en')).toBe('Sun');
    expect(weekdayName(6, 'en')).toBe('Sat');
  });
  it('maps the week (ja)', () => {
    expect(weekdayName(0, 'ja')).toBe('日');
    expect(weekdayName(6, 'ja')).toBe('土');
  });
  it('returns empty for out-of-range', () => {
    expect(weekdayName(7, 'en')).toBe('');
    expect(weekdayName(7, 'ja')).toBe('');
  });
});

describe('formatDate', () => {
  it('builds a label (en)', () => {
    // 2026-06-20 is a Saturday.
    expect(formatDate(new Date(2026, 5, 20), 'en')).toBe('Jun 20 (Sat)');
  });
  it('builds a month/day/weekday label (ja)', () => {
    expect(formatDate(new Date(2026, 5, 20), 'ja')).toBe('6月20日(土)');
  });
});
