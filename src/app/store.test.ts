// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from './store';
import {
  DEFAULT_SETTINGS,
  alarmRepo,
  sleepRepo,
} from '../data/repositories';
import type { AlarmConfig } from '../domain/types';

/**
 * Integration tests for the Zustand store wired to the real repositories.
 * `syncSchedules` is inert off-device (isNative() === false) and the Capacitor
 * Preferences web fallback persists to localStorage, so the store + data layer
 * round-trip end to end without mocks. Each test starts from a clean slate.
 */
function resetStore() {
  localStorage.clear();
  useStore.setState({
    loaded: false,
    sessions: [],
    alarms: [],
    settings: DEFAULT_SETTINGS,
    active: null,
    pendingMorning: null,
  });
}

function alarm(over: Partial<AlarmConfig> = {}): AlarmConfig {
  return {
    id: 'al-1',
    time: '07:00',
    repeatDays: [1, 2, 3, 4, 5],
    sound: 'default',
    snoozeEnabled: true,
    snoozeMinutes: 5,
    enabled: true,
    ...over,
  };
}

beforeEach(resetStore);
afterEach(() => vi.useRealTimers());

describe('session lifecycle', () => {
  it('starts a session and ends it into the morning check with a duration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:00:00Z'));
    useStore.getState().startSession();
    expect(useStore.getState().active).not.toBeNull();

    vi.setSystemTime(new Date('2026-06-21T07:00:00Z')); // +8h
    useStore.getState().endSession();
    const { active, pendingMorning } = useStore.getState();
    expect(active).toBeNull();
    expect(pendingMorning?.durationMin).toBe(480);
  });

  it('cancelSession discards the session without queuing a morning check', () => {
    useStore.getState().startSession();
    useStore.getState().cancelSession();
    expect(useStore.getState().active).toBeNull();
    expect(useStore.getState().pendingMorning).toBeNull();
  });

  it('saveMorningCheck scores, persists, and clears the pending session', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:00:00Z'));
    useStore.getState().startSession();
    vi.setSystemTime(new Date('2026-06-21T06:30:00Z')); // exactly the 450-min target
    useStore.getState().endSession();
    vi.useRealTimers();

    await useStore.getState().saveMorningCheck({ mood: 'fresh', note: '  ok  ' });

    const { sessions, pendingMorning } = useStore.getState();
    expect(pendingMorning).toBeNull();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].mood).toBe('fresh');
    expect(sessions[0].note).toBe('ok'); // trimmed
    expect(typeof sessions[0].qualityScore).toBe('number');

    // Persisted through the repository, not just held in memory.
    const stored = await sleepRepo.all();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(sessions[0].id);
  });

  it('dismissMorning keeps a duration-only record', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:00:00Z'));
    useStore.getState().startSession();
    vi.setSystemTime(new Date('2026-06-21T07:00:00Z'));
    useStore.getState().endSession();
    vi.useRealTimers();

    useStore.getState().dismissMorning();
    const { sessions, pendingMorning } = useStore.getState();
    expect(pendingMorning).toBeNull();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].qualityScore).toBeUndefined();
    expect(sessions[0].mood).toBeUndefined();
  });
});

describe('session edits', () => {
  it('updateSession edits in place and persists', async () => {
    const s = {
      id: 's1',
      startedAt: '2026-06-20T23:00:00Z',
      endedAt: '2026-06-21T07:00:00Z',
      durationMin: 480,
    };
    await useStore.getState().replaceSessions([s]);

    await useStore.getState().updateSession({ ...s, note: 'edited' });
    expect(useStore.getState().sessions[0].note).toBe('edited');
    expect((await sleepRepo.all())[0].note).toBe('edited');
  });

  it('deleteSession removes from state and storage', async () => {
    const s = {
      id: 's1',
      startedAt: '2026-06-20T23:00:00Z',
      endedAt: '2026-06-21T07:00:00Z',
      durationMin: 480,
    };
    await useStore.getState().replaceSessions([s]);
    await useStore.getState().deleteSession('s1');
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(await sleepRepo.all()).toHaveLength(0);
  });
});

describe('alarms', () => {
  it('saveAlarm adds, then updates the same id rather than duplicating', async () => {
    await useStore.getState().saveAlarm(alarm({ id: 'a', time: '06:00' }));
    expect(useStore.getState().alarms).toHaveLength(1);

    await useStore.getState().saveAlarm(alarm({ id: 'a', time: '06:30' }));
    const { alarms } = useStore.getState();
    expect(alarms).toHaveLength(1);
    expect(alarms[0].time).toBe('06:30');
    expect((await alarmRepo.all())[0].time).toBe('06:30');
  });

  it('deleteAlarm removes from state and storage', async () => {
    await useStore.getState().saveAlarm(alarm({ id: 'a' }));
    await useStore.getState().deleteAlarm('a');
    expect(useStore.getState().alarms).toHaveLength(0);
    expect(await alarmRepo.all()).toHaveLength(0);
  });
});

describe('settings', () => {
  it('saveSettings updates state and persists, reflected on init', async () => {
    await useStore
      .getState()
      .saveSettings({ ...DEFAULT_SETTINGS, lang: 'ja', targetDurationMin: 420 });
    expect(useStore.getState().settings.lang).toBe('ja');

    // A fresh init() should rehydrate the persisted settings.
    useStore.setState({ settings: DEFAULT_SETTINGS });
    await useStore.getState().init();
    expect(useStore.getState().settings.targetDurationMin).toBe(420);
    expect(useStore.getState().loaded).toBe(true);
  });
});
