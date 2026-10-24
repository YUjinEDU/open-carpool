import { addDays } from '../../domain/dates';

/**
 * Minutes from `now` until absences close for a trip (cutoffHour on the day before, in `tz`).
 * Negative once the cutoff has passed. Whole-hour zones without DST (Asia/Seoul) are exact; elsewhere a
 * DST switch inside the window can shift the result by an hour, which the countdown tolerates.
 */
export function minutesUntilCutoff(tripDate: string, cutoffHour: number, now: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';
  const localDate = `${part('year')}-${part('month')}-${part('day')}`;
  const localMinutes = Number(part('hour')) * 60 + Number(part('minute'));
  const deadline = addDays(tripDate, -1);
  const dayDiff = Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${localDate}T00:00:00Z`)) / 86_400_000);
  return dayDiff * 1440 + cutoffHour * 60 - localMinutes;
}
