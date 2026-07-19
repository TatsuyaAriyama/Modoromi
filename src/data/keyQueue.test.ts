import { beforeEach, describe, expect, it } from 'vitest';
import { enqueue, resetQueues } from './keyQueue';

/** A promise the test resolves by hand — no timers, no racing the event loop. */
function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let queued microtasks settle a bounded number of times. */
const drain = async (turns = 10) => {
  for (let i = 0; i < turns; i++) await Promise.resolve();
};

beforeEach(resetQueues);

describe('keyQueue', () => {
  it('runs tasks on one key strictly in order', async () => {
    const order: number[] = [];
    const gate = deferred();

    const a = enqueue('k', async () => {
      await gate.promise;
      order.push(1);
    });
    const b = enqueue('k', async () => {
      order.push(2);
    });

    await drain();
    // The second task must not have started while the first is still open.
    expect(order).toEqual([]);

    gate.resolve();
    await Promise.all([a, b]);
    expect(order).toEqual([1, 2]);
  });

  it('does not let a stuck key block a different key', async () => {
    const stuck = deferred();
    enqueue('slow', () => stuck.promise);

    // Under a single global chain this would never resolve.
    await expect(enqueue('fast', async () => 'done')).resolves.toBe('done');
    stuck.resolve();
  });

  it('rejects only the failing caller and keeps the chain running', async () => {
    const boom = enqueue('k', async () => {
      throw new Error('write failed');
    });
    const after = enqueue('k', async () => 'survived');

    await expect(boom).rejects.toThrow('write failed');
    await expect(after).resolves.toBe('survived');
  });

  it('forgets a key once its chain drains, so the map cannot grow forever', async () => {
    await enqueue('k', async () => 'x');
    await drain();
    // A fresh chain on the same key still works after the cleanup.
    await expect(enqueue('k', async () => 'y')).resolves.toBe('y');
  });
});
