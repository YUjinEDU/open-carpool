/** Display formatting for calendar dates ('YYYY-MM-DD') and 'HH:MM' times. No ISO strings reach the screen. */

const utcDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** "10월 27일 (화)" / "Tue, Oct 27". */
export const formatDate = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(utcDate(date));

/** "화" / "Tue" for a date. */
export const weekdayOf = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(utcDate(date));

/** "27" for a date. */
export const dayOf = (date: string): string => String(Number(date.slice(8, 10)));

/** Day cell content: weekday above the day number. */
export const dayCell = (date: string, locale: string): { readonly weekday: string; readonly day: string } => ({
  weekday: weekdayOf(date, locale),
  day: dayOf(date),
});

/** Names joined for a sentence: "김도윤, 이하은". */
export const joinNames = (names: readonly string[]): string => names.join(', ');
