import { describe, expect, it } from 'vitest';
import { inCircularWindow, toHm } from './nightShift';

describe('inCircularWindow', () => {
  it('handles a window that crosses midnight', () => {
    // wind-down 22:00 → wake 07:00
    expect(inCircularWindow('23:30', '22:00', '07:00')).toBe(true);
    expect(inCircularWindow('02:00', '22:00', '07:00')).toBe(true);
    expect(inCircularWindow('06:59', '22:00', '07:00')).toBe(true);
    expect(inCircularWindow('07:00', '22:00', '07:00')).toBe(false); // end is open
    expect(inCircularWindow('21:59', '22:00', '07:00')).toBe(false);
    expect(inCircularWindow('12:00', '22:00', '07:00')).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(inCircularWindow('14:00', '13:00', '17:00')).toBe(true);
    expect(inCircularWindow('17:00', '13:00', '17:00')).toBe(false);
    expect(inCircularWindow('12:59', '13:00', '17:00')).toBe(false);
  });

  it('is empty when start equals end', () => {
    expect(inCircularWindow('22:00', '22:00', '22:00')).toBe(false);
  });
});

describe('toHm', () => {
  it('zero-pads hours and minutes', () => {
    expect(toHm(new Date(2026, 5, 21, 7, 5))).toBe('07:05');
    expect(toHm(new Date(2026, 5, 21, 23, 0))).toBe('23:00');
  });
});
