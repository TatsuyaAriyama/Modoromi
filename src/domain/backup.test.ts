import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, parseBackup } from './backup';
import type { AlarmConfig, SleepSession, UserSettings } from './types';

const session: SleepSession = {
  id: 'a',
  startedAt: '2026-06-19T23:00:00.000Z',
  endedAt: '2026-06-20T07:00:00.000Z',
  durationMin: 480,
  mood: 'fresh',
  qualityScore: 82,
  movements: [{ t: 12, magnitude: 1.4 }],
};

const alarm: AlarmConfig = {
  id: 'al',
  time: '07:00',
  repeatDays: [1, 2, 3, 4, 5],
  sound: 'default',
  snoozeEnabled: true,
  snoozeMinutes: 5,
  enabled: true,
};

const settings: UserSettings = {
  lang: 'en',
  theme: 'auto',
  targetDurationMin: 450,
  defaultWakeTime: '07:00',
  bedtimeReminder: false,
  onboarded: true,
  smartAlarm: false,
  smartWindowMin: 30,
};

function blob(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: 'Madoromi',
    version: 1,
    sessions: [session],
    alarms: [alarm],
    settings,
    ...extra,
  });
}

describe('parseBackup', () => {
  it('accepts a well-formed export', () => {
    const r = parseBackup(blob());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.version).toBe(BACKUP_VERSION);
      expect(r.data.sessions).toHaveLength(1);
      expect(r.data.alarms).toHaveLength(1);
      expect(r.data.settings?.targetDurationMin).toBe(450);
    }
  });

  it('migrates a version-less (legacy) export up to the current version', () => {
    const legacy = JSON.stringify({
      app: 'Madoromi',
      // no `version` field — predates schema versioning
      sessions: [session],
      alarms: [alarm],
      settings,
    });
    const r = parseBackup(legacy);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.version).toBe(BACKUP_VERSION);
      expect(r.data.sessions).toHaveLength(1);
    }
  });

  it('rejects a backup from a newer schema this build cannot read', () => {
    const r = parseBackup(blob({ version: BACKUP_VERSION + 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('unsupported-version');
  });

  it('accepts a backup that declares the current version', () => {
    const r = parseBackup(blob({ version: BACKUP_VERSION }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.version).toBe(BACKUP_VERSION);
  });

  it('rejects non-JSON input', () => {
    const r = parseBackup('not json {');
    expect(r.ok).toBe(false);
  });

  it('rejects a backup from another app', () => {
    const r = parseBackup(JSON.stringify({ app: 'Other', sessions: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-madoromi');
  });

  it('rejects a malformed session entry', () => {
    const bad = JSON.stringify({
      app: 'Madoromi',
      sessions: [{ id: 'x', startedAt: '...', durationMin: 'oops' }],
    });
    const r = parseBackup(bad);
    expect(r.ok).toBe(false);
  });

  it('tolerates a missing smartAlarm field on older settings', () => {
    const old = JSON.stringify({
      app: 'Madoromi',
      sessions: [],
      alarms: [],
      settings: {
        theme: 'night',
        targetDurationMin: 420,
        defaultWakeTime: '06:30',
        bedtimeReminder: true,
        onboarded: true,
      },
    });
    const r = parseBackup(old);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.settings?.smartAlarm).toBe(false);
  });

  it('treats a missing sessions field as empty', () => {
    const r = parseBackup(JSON.stringify({ app: 'Madoromi' }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sessions).toEqual([]);
      expect(r.data.alarms).toEqual([]);
      expect(r.data.settings).toBeNull();
    }
  });

  it('rejects when settings is present but corrupt, by dropping it to null', () => {
    const r = parseBackup(
      JSON.stringify({ app: 'Madoromi', sessions: [], settings: { theme: 'x' } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.settings).toBeNull();
  });
});
