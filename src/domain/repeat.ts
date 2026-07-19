import type { Lang } from './types';
import { translate, weekdayName } from '../i18n/catalog';

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/**
 * A repeat pattern as a phrase, for the row's spoken name.
 *
 * Shape-based rather than a seven-item list: "Weekdays" is what the user means
 * and what the dots draw, and hearing "Monday, Tuesday, Wednesday, Thursday,
 * Friday" at 7am is a punishment. Only an irregular set is enumerated.
 */
export function repeatPhrase(days: number[], lang: Lang): string {
  if (days.length === 0) return translate(lang, 'repeat.once');
  if (days.length === 7) return translate(lang, 'repeat.daily');
  if (sameSet(days, WEEKDAYS)) return translate(lang, 'repeat.weekdays');
  if (sameSet(days, WEEKEND)) return translate(lang, 'repeat.weekends');
  // The separator is language-dependent: Japanese lists join with '・'.
  const sep = lang === 'ja' ? '・' : ', ';
  return [...days]
    .sort()
    .map((d) => weekdayName(d, lang))
    .join(sep);
}
