/**
 * Per-key FIFO. Every repository mutation is a read-modify-write over a single
 * JSON blob, so the RMW — not the individual get/set — is the atomic unit: two
 * saves in the same tick both read the pre-change list, and the second write
 * erases the first. Chains are per key, so a slow sessions write cannot delay
 * an alarm toggle.
 *
 * RULE: a queued task must never enqueue() on the key it already holds. Read
 * with getJSON directly inside the body, never through the repository's
 * all()/get() — that would await a chain containing the task itself.
 */
const tails = new Map<string, Promise<void>>();
const swallow = () => {};

export function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  // The stored tail is rejection-swallowed so one failed write cannot poison
  // the chain; the caller's own promise still carries the rejection.
  const run: Promise<T> = (tails.get(key) ?? Promise.resolve()).then(task);
  const tail = run.then(swallow, swallow);
  tails.set(key, tail);
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return run;
}

/** Test-only: drop every chain so suites cannot leak state into each other. */
export function resetQueues(): void {
  tails.clear();
}
