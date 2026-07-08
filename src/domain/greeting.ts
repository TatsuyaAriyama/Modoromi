/**
 * Time-of-day slot for the Home greeting, so the first line of the app meets
 * the user where they are: a morning hello, a daytime nod, the evening
 * wind-down cue, and a gentle close to the night. Pure given `now`.
 */
export type GreetingSlot = 'morning' | 'day' | 'evening' | 'night';

export function greetingSlot(now: Date = new Date()): GreetingSlot {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}
