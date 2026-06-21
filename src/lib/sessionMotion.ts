import type { Movement } from '../domain/types';
import { isMotionTracked, type MotionMode } from '../domain/motion';
import { MotionRecorder } from './motion';
import { SleepMotion, sleepMotionAvailable } from './sleepMotion';

/**
 * One motion tracker per sleep session, hiding the platform split:
 *
 *  - When a native background recorder is available it becomes the source of
 *    truth for the night's movements — it keeps sampling with the screen off,
 *    so the log reflects the whole night rather than the first minute.
 *  - A foreground JS recorder always runs too. It can't see the screen-off
 *    stretch, but it drives the live on-screen count and the smart-wake
 *    heuristic (which is inherently a foreground feature). When no native
 *    recorder exists, it's the fallback source for the final log.
 *
 * `stop()` returns the movements to store, or `undefined` when nothing was
 * actually captured (so the night is marked untracked rather than "still").
 */
export class SessionMotion {
  private mode: MotionMode = 'none';
  private readonly js = new MotionRecorder();

  async start(): Promise<void> {
    if (await sleepMotionAvailable()) {
      try {
        await SleepMotion.start();
        this.mode = 'native';
      } catch {
        this.mode = 'none';
      }
    }
    // Always run the live listener (foreground): it powers the on-screen count
    // and smart-wake, and is the fallback log when there's no native recorder.
    const attached = await this.js.start();
    if (this.mode !== 'native') this.mode = attached ? 'js' : 'none';
  }

  /** Live movements seen while foregrounded — for smart-wake and the UI count. */
  get live(): Movement[] {
    return this.js.current;
  }

  /** True when a background recorder owns the authoritative night log. */
  get isBackground(): boolean {
    return this.mode === 'native';
  }

  /** Stop everything and resolve the movements to store (or undefined). */
  async stop(): Promise<Movement[] | undefined> {
    const jsMovements = this.js.stop();
    const jsSamples = this.js.sampleCount;

    if (this.mode === 'native') {
      // A native recording always counts as tracked (an empty list means a
      // genuinely still night, not "no data").
      try {
        return (await SleepMotion.stop()).movements ?? [];
      } catch {
        return [];
      }
    }

    return isMotionTracked(this.mode, jsSamples) ? jsMovements : undefined;
  }
}
