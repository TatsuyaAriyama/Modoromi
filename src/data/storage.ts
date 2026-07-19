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

/* ── Checked reads ───────────────────────────────────────────────────────
   getJSON answers a malformed blob with the caller's fallback. For the sleep
   log that fallback is [], so an unreadable file shows as an empty history —
   and the next write persists that emptiness. A read error silently becomes a
   permanent deletion.

   readChecked instead copies the raw bytes aside under a quarantine key and
   retires the live key, so the data is recoverable and the app can say what
   happened. It is purely additive: the three exports above are untouched. */

export type FaultReason = 'unparseable' | 'wrong-shape' | 'partial';

export type ParseOutcome<T> =
  | { ok: true; value: T; dropped: number }
  | { ok: false };

export type ReadResult<T> =
  | { ok: true; value: T; dropped: number }
  | { ok: false; reason: FaultReason };

const Q_PREFIX = 'madoromi.quarantine.';

/**
 * Copy the RAW STRING aside, then retire the live key — in that order. If the
 * quarantine write throws (storage full) the live key is left alone: a failed
 * rescue must never become a deletion.
 *
 * Re-serializing a parsed value is not an option. If it did not parse there is
 * no parsed value, and if it did, the anomaly is exactly what re-serializing
 * would erase.
 */
async function quarantine(key: string, raw: string): Promise<boolean> {
  try {
    await Preferences.set({ key: `${Q_PREFIX}${key}`, value: raw });
  } catch {
    return false;
  }
  await Preferences.remove({ key });
  return true;
}

/**
 * Read a key, validating its shape. `empty` is what an ABSENT key means —
 * absent is not the same as unreadable, and only the caller knows the
 * difference between [] and {}.
 */
export async function readChecked<T>(
  key: string,
  parse: (raw: unknown) => ParseOutcome<T>,
  empty: T,
): Promise<ReadResult<T>> {
  const { value: raw } = await Preferences.get({ key });
  if (raw == null) return { ok: true, value: empty, dropped: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await quarantine(key, raw);
    return { ok: false, reason: 'unparseable' };
  }

  const r = parse(parsed);
  if (!r.ok) {
    await quarantine(key, raw);
    return { ok: false, reason: 'wrong-shape' };
  }
  // Some entries survived and some did not. Keep the originals aside; the
  // caller goes on using the good ones, so the pruning is never silent.
  if (r.dropped > 0) await quarantine(key, raw);
  return r;
}

/** Discard every quarantined blob (Settings → delete all). */
export async function purgeQuarantine(): Promise<void> {
  const { keys } = await Preferences.keys();
  await Promise.all(
    keys
      .filter((k) => k.startsWith(Q_PREFIX))
      .map((k) => Preferences.remove({ key: k })),
  );
}
