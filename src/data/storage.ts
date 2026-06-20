import { Preferences } from '@capacitor/preferences';

/**
 * Thin async key/value layer over @capacitor/preferences. On web (dev) the
 * Capacitor Preferences plugin falls back to an in-memory/IndexedDB-backed
 * store, so we never touch localStorage/sessionStorage directly.
 */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function removeKey(key: string): Promise<void> {
  await Preferences.remove({ key });
}
