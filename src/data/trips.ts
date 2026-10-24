import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { applyTrip } from '../domain/rotation';
import type { Scores, Trip, TripCost } from '../domain/types';
import { idConverter, nowIso } from './converters';
import { crewRef } from './crews';

export interface DateRange {
  readonly from: string; // 'YYYY-MM-DD' inclusive
  readonly to: string; // 'YYYY-MM-DD' inclusive
}

export interface TripCompletion {
  readonly driverId: string;
  readonly riderIds: string[];
}

export class TripAlreadyAppliedError extends Error {
  constructor(readonly tripId: string) {
    super(`trip already applied to the ledger: ${tripId}`);
    this.name = 'TripAlreadyAppliedError';
  }
}

/** The trip's driver changed under the caller: someone else volunteered, or the caller no longer drives it. */
export class DriverTakenError extends Error {
  constructor(readonly tripId: string) {
    super(`trip driver already changed: ${tripId}`);
    this.name = 'DriverTakenError';
  }
}

const tripsCol = (gid: string, cid: string) =>
  collection(db, 'groups', gid, 'crews', cid, 'trips').withConverter(idConverter<Trip>());
const tripRef = (gid: string, cid: string, tripId: string) =>
  doc(db, 'groups', gid, 'crews', cid, 'trips', tripId).withConverter(idConverter<Trip>());

const isSettled = (trip: Trip): boolean => trip.applied || trip.status === 'done';

/** A planner write: the trip ids it covers and how to derive the writes from their stored state. */
export interface PlanWrite {
  readonly ids: readonly string[];
  /** Trips to write given the stored trips among `ids`; re-run on every transaction attempt. */
  readonly writesFor: (stored: readonly Trip[]) => readonly Trip[];
}

/**
 * Write planned trips in one transaction, computed from what is stored at commit time so a stale
 * snapshot never overwrites a concurrent absence or volunteer. Existing trips get only their plan
 * fields (absentIds are owned by markAbsent); settled trips are skipped.
 */
export async function upsertPlannedTrips(gid: string, cid: string, { ids, writesFor }: PlanWrite): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(ids.map((id) => tx.get(tripRef(gid, cid, id))));
    const stored = snaps.flatMap((s) => (s.exists() ? [s.data()] : []));
    const byId = new Map(stored.map((t) => [t.id, t]));
    for (const trip of writesFor(stored)) {
      const prev = byId.get(trip.id);
      const ref = tripRef(gid, cid, trip.id);
      if (prev === undefined) tx.set(ref, trip);
      else if (!isSettled(prev)) tx.update(ref, { driverId: trip.driverId, riderIds: trip.riderIds, status: trip.status });
    }
  });
}

export async function markAbsent(gid: string, cid: string, tripId: string, uid: string, absent: boolean): Promise<void> {
  await updateDoc(tripRef(gid, cid, tripId), { absentIds: absent ? arrayUnion(uid) : arrayRemove(uid) });
}

/** Take an open trip. Throws DriverTakenError when someone else got it first. */
export async function volunteerToDrive(gid: string, cid: string, tripId: string, uid: string): Promise<void> {
  const ref = tripRef(gid, cid, tripId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`trip not found: ${tripId}`);
    const trip = snap.data();
    if (trip.status !== 'needs_driver' || trip.driverId !== null) throw new DriverTakenError(tripId);
    tx.update(ref, { driverId: uid, status: 'planned', riderIds: trip.riderIds.filter((id) => id !== uid) });
  });
}

/** Hand back a trip the caller drives. Throws DriverTakenError when the caller is not its driver any more. */
export async function giveUpDriving(gid: string, cid: string, tripId: string, uid: string): Promise<void> {
  const ref = tripRef(gid, cid, tripId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`trip not found: ${tripId}`);
    if (snap.data().driverId !== uid) throw new DriverTakenError(tripId);
    tx.update(ref, { driverId: null, status: 'needs_driver' });
  });
}

/** Record the actual cost of a done trip (rules allow only `cost` to change after completion). */
export async function setTripCost(gid: string, cid: string, tripId: string, cost: TripCost): Promise<void> {
  await updateDoc(tripRef(gid, cid, tripId), { cost });
}

/** Mark a trip done and apply it to the crew ledger exactly once. Returns the new scores. */
export async function completeTrip(
  gid: string,
  cid: string,
  tripId: string,
  completion: TripCompletion,
  completedBy: string,
): Promise<Scores> {
  return runTransaction(db, async (tx) => {
    const crewSnap = await tx.get(crewRef(gid, cid));
    const tripSnap = await tx.get(tripRef(gid, cid, tripId));
    if (!crewSnap.exists()) throw new Error(`crew not found: ${cid}`);
    if (!tripSnap.exists()) throw new Error(`trip not found: ${tripId}`);
    const crew = crewSnap.data();
    const trip = tripSnap.data();
    if (trip.applied) throw new TripAlreadyAppliedError(tripId);
    // A frozen trip can still name someone who has since left the crew; only current members move.
    const riderIds = [...new Set(completion.riderIds)].filter(
      (id) => id !== completion.driverId && crew.memberIds.includes(id),
    );
    const scores = applyTrip(crew.scores, completion.driverId, riderIds);
    tx.update(tripRef(gid, cid, tripId), {
      status: 'done',
      applied: true,
      completedBy,
      completedAt: nowIso(),
      driverId: completion.driverId,
      riderIds,
    });
    // ledgerTripId binds this ledger move to the trip settled in the same transaction (firestore.rules).
    tx.update(crewRef(gid, cid), {
      scores,
      lastDroveOn: { ...crew.lastDroveOn, [completion.driverId]: trip.date },
      ledgerTripId: tripId,
    });
    return scores;
  });
}

const tripsInRange = (gid: string, cid: string, range: DateRange) =>
  query(tripsCol(gid, cid), where('date', '>=', range.from), where('date', '<=', range.to), orderBy('date'));

export async function listTrips(gid: string, cid: string, range: DateRange): Promise<Trip[]> {
  const snap = await getDocs(tripsInRange(gid, cid, range));
  return snap.docs.map((d) => d.data());
}

export interface TripSubscription {
  readonly gid: string;
  readonly cid: string;
  readonly range: DateRange;
}

export function subscribeTrips(
  { gid, cid, range }: TripSubscription,
  onChange: (trips: Trip[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(tripsInRange(gid, cid, range), (snap) => onChange(snap.docs.map((d) => d.data())), onError);
}
