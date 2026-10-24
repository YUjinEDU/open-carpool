import { addDays, DEFAULT_TZ, isoWeekday, nextNDays, zonedDateHour } from './dates';
import { plateAllowed } from './policies';
import { applyTrip, pickDriver } from './rotation';
import type { Crew, GroupPolicy, Leg, Member, Scores, Trip, TripStatus } from './types';

export interface PlanInput {
  readonly crew: Crew;
  readonly members: readonly Member[];
  readonly from: string; // first date of the window, 'YYYY-MM-DD'
  readonly days: number;
  readonly existing: readonly Trip[];
  readonly now: Date;
  readonly tz?: string;
  readonly policy: GroupPolicy;
}

/** Absences may change until cutoffHour (local) on the day before the trip; after that the plan is frozen. */
export function isPastCutoff(tripDate: string, cutoffHour: number, now: Date, tz: string = DEFAULT_TZ): boolean {
  const deadline = addDays(tripDate, -1);
  const local = zonedDateHour(now, tz);
  return local.date > deadline || (local.date === deadline && local.hour >= cutoffHour);
}

export const tripId = (date: string, leg: Leg): string => `${date}_${leg}`;

/**
 * Plan trips for the crew's weekdays in [from, from + days). Done and frozen trips are returned
 * unchanged; a cancelled trip (its day had been removed from the crew) is planned again before the cutoff. Driver choice simulates the ledger forward so a multi-day plan rotates
 * instead of naming the same lowest-score driver every day. A driver already set on an open trip
 * (volunteer or previous plan) is kept while still present and eligible.
 */
export function planTrips({ crew, members, from, days, existing, now, tz = DEFAULT_TZ, policy }: PlanInput): Trip[] {
  if (crew.status !== 'active') return [];
  const memberById = new Map(members.map((m) => [m.uid, m]));
  const crewIds = crew.memberIds.filter((id) => memberById.get(id)?.status === 'active');
  const existingById = new Map(existing.map((t) => [t.id, t]));
  const legs: Leg[] = [...(crew.outTime ? (['out'] as const) : []), ...(crew.backTime ? (['back'] as const) : [])];

  let scores: Scores = crew.scores;
  let lastDroveOn: Record<string, string> = crew.lastDroveOn;
  const project = (t: Trip): void => {
    if (t.driverId === null || t.applied || t.status === 'cancelled') return;
    scores = applyTrip(scores, t.driverId, t.riderIds);
    lastDroveOn = { ...lastDroveOn, [t.driverId]: t.date };
  };

  const trips: Trip[] = [];
  for (const date of nextNDays(from, days)) {
    if (!crew.days.includes(isoWeekday(date))) continue;
    for (const leg of legs) {
      const id = tripId(date, leg);
      const prev = existingById.get(id);
      if (prev && (prev.status === 'done' || isPastCutoff(date, policy.absenceCutoffHour, now, tz))) {
        trips.push(prev);
        project(prev);
        continue;
      }
      const absentIds = prev?.absentIds ?? [];
      const present = crewIds.filter((uid) => !absentIds.includes(uid));
      const eligible = present.filter((uid) => {
        const m = memberById.get(uid);
        return m !== undefined && m.canDrive && plateAllowed(policy.plateRotation, m.plateLastDigit, date);
      });
      const kept = prev?.driverId != null && eligible.includes(prev.driverId) ? prev.driverId : null;
      const driverId = kept ?? pickDriver({ present, eligible, scores, lastDroveOn });
      const status: TripStatus = driverId === null ? 'needs_driver' : 'planned';
      const trip: Trip = {
        id,
        date,
        leg,
        driverId,
        riderIds: present.filter((uid) => uid !== driverId),
        absentIds: [...absentIds],
        status,
        applied: false,
        completedBy: null,
        completedAt: null,
        cost: prev?.cost ?? null,
      };
      trips.push(trip);
      project(trip);
    }
  }
  return trips;
}
