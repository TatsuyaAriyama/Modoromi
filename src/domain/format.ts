/** Format a minute count as "7時間30分" / "30分". */
export function formatDurationJa(min: number): string {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}分`;
  if (m === 0) return `${sign}${h}時間`;
  return `${sign}${h}時間${m}分`;
}

/** Format a minute count as compact "7h30m" for charts. */
export function formatDurationShort(min: number): string {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

/** "HH:mm" from an ISO string (local time). */
export function isoToHm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/** Parse "HH:mm" to {hour, minute}. */
export function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

/** Subtract `min` minutes from "HH:mm", wrapping within 24h. */
export function subtractMinutesHm(hm: string, min: number): string {
  const { hour, minute } = parseHm(hm);
  let total = hour * 60 + minute - min;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
export function weekdayJa(i: number): string {
  return WEEKDAYS_JA[i] ?? '';
}

/** "6月20日(金)" style label. */
export function formatDateJa(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdayJa(d.getDay())})`;
}
