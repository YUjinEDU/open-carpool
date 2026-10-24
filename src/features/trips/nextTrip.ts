import type { Crew, Leg, Trip } from '../../domain/types';
import { isOpenTrip } from './tripActions';

export interface CrewTrip {
  readonly crew: Crew;
  readonly trip: Trip;
}

export const legTime = (crew: Pick<Crew, 'outTime' | 'backTime'>, leg: Leg): string =>
  (leg === 'out' ? crew.outTime : crew.backTime) ?? '';

/** Chronological: by date, the outbound leg before the return leg. */
export const compareTrips = (a: Trip, b: Trip): number =>
  a.date.localeCompare(b.date) || Number(a.leg === 'back') - Number(b.leg === 'back');

const sortKey = ({ crew, trip }: CrewTrip): string => `${trip.date} ${legTime(crew, trip.leg)} ${trip.leg}`;

/** My earliest open trip from today on (absent trips skipped). */
export function pickNextTrip(items: readonly CrewTrip[], meUid: string, todayDate: string): CrewTrip | null {
  const mine = items
    .filter(({ trip }) => isOpenTrip(trip.status) && !trip.applied && trip.date >= todayDate && !trip.absentIds.includes(meUid))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return mine[0] ?? null;
}
