import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { applyTrip } from '../domain/rotation';
import type { Scores, Trip } from '../domain/types';
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

const tripsCol = (gid: string, cid: string) =>
  collection(db, 'groups', gid, 'crews', cid, 'trips').withConverter(idConverter<Trip>());
const tripRef = (gid: string, cid: string, tripId: string) =>
  doc(db, 'groups', gid, 'crews', cid, 'trips', tripId).withConverter(idConverter<Trip>());

const isSettled = (trip: Trip): boolean => trip.applied || trip.status === 'done';

/** Write planned trips idempotently; trips already completed are never overwritten. */
export async function upsertPlannedTrips(gid: string, cid: string, trips: Trip[]): Promise<void> {
  const existing = await Promise.all(trips.map((t) => getDoc(tripRef(gid, cid, t.id))));
  const batch = writeBatch(db);
  trips.forEach((trip, i) => {
    const current = existing[i];
    if (current?.exists() && isSettled(current.data())) return;
    batch.set(tripRef(gid, cid, trip.id), trip, { merge: true });
  });
  await batch.commit();
}

export async function markAbsent(gid: string, cid: string, tripId: string, uid: string, absent: boolean): Promise<void> {
  await updateDoc(tripRef(gid, cid, tripId), { absentIds: absent ? arrayUnion(uid) : arrayRemove(uid) });
}

export async function volunteerToDrive(gid: string, cid: string, tripId: string, uid: string): Promise<void> {
  await updateDoc(tripRef(gid, cid, tripId), { driverId: uid, status: 'planned', riderIds: arrayRemove(uid) });
}

export async function giveUpDriving(gid: string, cid: string, tripId: string): Promise<void> {
  await updateDoc(tripRef(gid, cid, tripId), { driverId: null, status: 'needs_driver' });
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
    const riderIds = [...new Set(completion.riderIds)].filter((id) => id !== completion.driverId);
    const scores = applyTrip(crew.scores, completion.driverId, riderIds);
    tx.update(tripRef(gid, cid, tripId), {
      status: 'done',
      applied: true,
      completedBy,
      completedAt: nowIso(),
      driverId: completion.driverId,
      riderIds,
    });
    tx.update(crewRef(gid, cid), {
      scores,
      lastDroveOn: { ...crew.lastDroveOn, [completion.driverId]: trip.date },
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
