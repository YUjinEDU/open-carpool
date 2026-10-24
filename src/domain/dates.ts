import type { Weekday } from './types';

/** Calendar dates are 'YYYY-MM-DD' strings interpreted in a group's IANA time zone. */
export const DEFAULT_TZ = 'Asia/Seoul';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_BY_JS_DAY: readonly Weekday[] = [7, 1, 2, 3, 4, 5, 6];

export interface ZonedDateHour {
  readonly date: string;
  readonly hour: number; // 0-23
}

function parseDate(date: string): Date {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`Expected YYYY-MM-DD, got "${date}"`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Local calendar date and hour of an instant in the given time zone. */
export function zonedDateHour(now: Date, tz: string = DEFAULT_TZ): ZonedDateHour {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')) };
}

export function today(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return zonedDateHour(now, tz).date;
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoWeekday(date: string): Weekday {
  return WEEKDAY_BY_JS_DAY[parseDate(date).getUTCDay()];
}

export function dayOfMonth(date: string): number {
  return parseDate(date).getUTCDate();
}

/** n consecutive dates starting at (and including) start. */
export function nextNDays(start: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}
