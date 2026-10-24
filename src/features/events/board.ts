import type { EventCar, RideEvent } from '../../domain/types';

export const carSeatsLeft = (car: EventCar): number => Math.max(0, car.seats - car.riderIds.length);

export const seatsLeft = (cars: readonly EventCar[]): number => cars.reduce((sum, car) => sum + carSeatsLeft(car), 0);

/** Soonest first: by date, then time. */
export const compareEvents = (a: RideEvent, b: RideEvent): number => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

/** 'YYYY-MM-DD' as "10월 27일 (화)" / "Tue, Oct 27" in the UI language. */
export function formatEventDate(date: string, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
