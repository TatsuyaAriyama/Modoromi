import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, sessionsToCsv } from './csv';
import type { SleepSession } from './types';

function mk(over: Partial<SleepSession> & { id: string }): SleepSession {
  return {
    startedAt: '2026-06-20T23:00:00',
    endedAt: '2026-06-21T07:00:00',
    durationMin: 480,
    ...over,
  };
}

describe('sessionsToCsv', () => {
  it('emits a header row even with no sessions', () => {
    const csv = sessionsToCsv([]);
    expect(csv).toBe(CSV_COLUMNS.join(','));
  });

  it('writes one row per session, oldest to newest', () => {
    const csv = sessionsToCsv([
      mk({ id: 'b', endedAt: '2026-06-22T07:00:00' }),
      mk({ id: 'a', endedAt: '2026-06-21T07:00:00' }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[1].startsWith('2026-06-21,')).toBe(true);
    expect(lines[2].startsWith('2026-06-22,')).toBe(true);
  });

  it('renders the human-readable fields', () => {
    const csv = sessionsToCsv([
      mk({
        id: 'a',
        startedAt: '2026-06-20T23:15:00',
        endedAt: '2026-06-21T06:45:00',
        durationMin: 450,
        mood: 'fresh',
        qualityScore: 82,
        subjective: 4,
        movements: [
          { t: 1, magnitude: 2 },
          { t: 2, magnitude: 3 },
        ],
      }),
    ]);
    const row = csv.split('\r\n')[1];
    expect(row).toBe('2026-06-21,23:15,06:45,450,fresh,82,4,2,,');
  });

  it('leaves optional fields blank when absent', () => {
    const csv = sessionsToCsv([mk({ id: 'a' })]);
    const row = csv.split('\r\n')[1];
    // mood, quality, subjective, movements, note, theme all empty
    expect(row).toBe('2026-06-21,23:00,07:00,480,,,,,,');
  });

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = sessionsToCsv([
      mk({ id: 'a', note: 'late, "rough" night\nwoke twice', theme: 'plain' }),
    ]);
    const row = csv.split('\r\n').slice(1).join('\r\n');
    // The embedded newline keeps the field quoted; quotes are doubled.
    expect(row).toContain('"late, ""rough"" night\nwoke twice"');
    expect(row.endsWith(',plain')).toBe(true);
  });
});

describe('the export is data, not display', () => {
  it('stays 24-hour regardless of any clock preference', () => {
    // The clock seam is display-only. If a future change routes csv.ts through
    // it, this breaks — which is the point.
    const csv = sessionsToCsv([
      {
        id: 'x',
        startedAt: '2026-07-18T23:05:00',
        endedAt: '2026-07-19T07:30:00',
        durationMin: 505,
      },
    ]);
    expect(csv).toContain('23:05');
    expect(csv).toContain('07:30');
    expect(csv).not.toMatch(/AM|PM|午前|午後/);
  });
});
