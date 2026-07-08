import { describe, expect, it } from 'vitest';
import { greetingSlot } from './greeting';

const at = (hour: number) => new Date(2026, 5, 20, hour, 0);

describe('greetingSlot', () => {
  it('maps the day into four slots at the documented boundaries', () => {
    expect(greetingSlot(at(5))).toBe('morning');
    expect(greetingSlot(at(9))).toBe('morning');
    expect(greetingSlot(at(10))).toBe('day');
    expect(greetingSlot(at(16))).toBe('day');
    expect(greetingSlot(at(17))).toBe('evening');
    expect(greetingSlot(at(20))).toBe('evening');
    expect(greetingSlot(at(21))).toBe('night');
    expect(greetingSlot(at(4))).toBe('night');
    expect(greetingSlot(at(0))).toBe('night');
  });
});
