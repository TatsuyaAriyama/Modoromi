import { describe, expect, it } from 'vitest';
import {
  formatDateJa,
  formatDurationJa,
  formatDurationShort,
  isoToHm,
  parseHm,
  subtractMinutesHm,
  weekdayJa,
} from './format';

describe('formatDurationJa', () => {
  it('formats hours and minutes', () => {
    expect(formatDurationJa(450)).toBe('7時間30分');
  });
  it('drops the minute part on the hour', () => {
    expect(formatDurationJa(420)).toBe('7時間');
  });
  it('drops the hour part under an hour', () => {
    expect(formatDurationJa(30)).toBe('30分');
    expect(formatDurationJa(0)).toBe('0分');
  });
  it('carries a leading sign for negatives', () => {
    expect(formatDurationJa(-450)).toBe('-7時間30分');
    expect(formatDurationJa(-30)).toBe('-30分');
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

describe('weekdayJa', () => {
  it('maps the week', () => {
    expect(weekdayJa(0)).toBe('日');
    expect(weekdayJa(6)).toBe('土');
  });
  it('returns empty for out-of-range', () => {
    expect(weekdayJa(7)).toBe('');
  });
});

describe('formatDateJa', () => {
  it('builds a month/day/weekday label', () => {
    // 2026-06-20 is a Saturday.
    expect(formatDateJa(new Date(2026, 5, 20))).toBe('6月20日(土)');
  });
});
