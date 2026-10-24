import type { Weekday, WeeklySchedule } from '../../domain/types';

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export interface DayDraft {
  readonly enabled: boolean;
  readonly out: string; // 'HH:MM' or ''
  readonly back: string;
}

export type ScheduleDraft = Readonly<Record<Weekday, DayDraft>>;

export function toDraft(schedule: WeeklySchedule): ScheduleDraft {
  const day = (d: Weekday): DayDraft => {
    const s = schedule[d];
    return { enabled: s !== undefined, out: s?.out ?? '', back: s?.back ?? '' };
  };
  return { 1: day(1), 2: day(2), 3: day(3), 4: day(4), 5: day(5), 6: day(6), 7: day(7) };
}

/** Enabled days only; empty times are omitted (a day with neither time is still a commute day). */
export function fromDraft(draft: ScheduleDraft): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (const d of WEEKDAYS) {
    const { enabled, out, back } = draft[d];
    if (enabled) schedule[d] = { ...(out ? { out } : {}), ...(back ? { back } : {}) };
  }
  return schedule;
}

/** Localized short weekday name (2024-01-01 was a Monday). */
export const weekdayName = (d: Weekday, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, d)));
