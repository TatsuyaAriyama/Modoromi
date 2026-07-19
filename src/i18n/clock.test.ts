import { describe, expect, it } from 'vitest';
import { formatHm, from12, hmParts, resolveClock, to12 } from './clock';

// `device` is passed explicitly everywhere below, so nothing here can depend
// on the machine's locale.
const en24 = resolveClock('24', 'en', true);
const en12 = resolveClock('12', 'en', false);
const ja12 = resolveClock('12', 'ja', false);
const ja24 = resolveClock('24', 'ja', true);

describe('clock', () => {
  it('leaves 24-hour display alone', () => {
    expect(formatHm('23:05', en24)).toBe('23:05');
    expect(formatHm('07:00', ja24)).toBe('07:00');
    expect(formatHm('00:30', en24)).toBe('00:30');
  });

  it('renders English 12-hour on the h12 cycle', () => {
    expect(formatHm('23:05', en12)).toBe('11:05 PM');
    expect(formatHm('00:30', en12)).toBe('12:30 AM');
    expect(formatHm('12:00', en12)).toBe('12:00 PM');
    expect(formatHm('07:00', en12)).toBe('7:00 AM');
  });

  it('renders Japanese 12-hour on the h11 cycle, period first', () => {
    // 午前0:30, never 午前12:30 — h11 is what Japanese actually writes.
    expect(formatHm('00:30', ja12)).toBe('午前0:30');
    expect(formatHm('23:05', ja12)).toBe('午後11:05');
    expect(formatHm('12:00', ja12)).toBe('午後0:00');
  });

  it('follows the device only when the preference is auto', () => {
    expect(resolveClock('auto', 'en', true).h12).toBe(true);
    expect(resolveClock('auto', 'en', false).h12).toBe(false);
    expect(resolveClock('24', 'en', true).h12).toBe(false);
    expect(resolveClock('12', 'en', false).h12).toBe(true);
  });

  it('round-trips every hour back to the stored 24-hour value', () => {
    for (const cycle of ['h11', 'h12'] as const) {
      for (let hour = 0; hour < 24; hour++) {
        const { h, pm } = to12(hour, cycle);
        expect(from12(h, pm, cycle)).toBe(hour);
      }
    }
  });

  it('keeps digits and period separate for tight layouts', () => {
    expect(hmParts('23:05', en12)).toEqual({
      digits: '11:05',
      period: 'PM',
      periodFirst: false,
    });
    expect(hmParts('23:05', ja12).periodFirst).toBe(true);
    expect(hmParts('23:05', en24).period).toBe('');
  });
});
