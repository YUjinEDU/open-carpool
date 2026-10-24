import { assertNever } from '../../domain/assert';
import { today } from '../../domain/dates';
import { isPastCutoff } from '../../domain/planning';
import { plateAllowed } from '../../domain/policies';
import type { Crew, GroupPolicy, Member, Trip, TripStatus } from '../../domain/types';

export type AbsenceAction = 'mark-absent' | 'mark-back';

/** Which actions the trip card offers to the signed-in member. */
export interface TripActions {
  /** Absence toggle until the cutoff: 'mark-absent' ("Can't go") or 'mark-back' ("I'm back"). */
  readonly absence: AbsenceAction | null;
  readonly cantDrive: boolean;
  readonly volunteer: boolean;
  readonly done: boolean;
  /** The trip is already applied to the ledger. */
  readonly completed: boolean;
}

export interface TripActionContext {
  readonly me: Pick<Member, 'uid' | 'canDrive' | 'plateLastDigit'>;
  readonly crew: Pick<Crew, 'memberIds' | 'captainId'>;
  readonly now: Date;
  readonly policy: GroupPolicy;
  readonly tz: string;
}

export function isOpenTrip(status: TripStatus): boolean {
  switch (status) {
    case 'planned':
    case 'needs_driver':
      return true;
    case 'done':
    case 'cancelled':
      return false;
    default:
      return assertNever(status);
  }
}

export function tripActions(trip: Trip, { me, crew, now, policy, tz }: TripActionContext): TripActions {
  const isMember = crew.memberIds.includes(me.uid);
  const open = isMember && isOpenTrip(trip.status) && !trip.applied;
  const isAbsent = trip.absentIds.includes(me.uid);
  const isDriver = trip.driverId === me.uid;
  const beforeCutoff = !isPastCutoff(trip.date, policy.absenceCutoffHour, now, tz);
  const mayDriveToday = me.canDrive && plateAllowed(policy.plateRotation, me.plateLastDigit, trip.date);
  return {
    absence: open && beforeCutoff ? (isAbsent ? 'mark-back' : 'mark-absent') : null,
    cantDrive: open && isDriver,
    volunteer: open && trip.status === 'needs_driver' && !isAbsent && mayDriveToday,
    done: open && trip.driverId !== null && (isDriver || crew.captainId === me.uid) && today(tz, now) >= trip.date,
    completed: trip.applied,
  };
}
