import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { EventCar, RideEvent } from '../domain/types';
import { idConverter, nowIso, plainConverter } from './converters';

export type CreateEventInput = Pick<RideEvent, 'title' | 'date' | 'time' | 'place'>;
export type MyCarInput = Pick<EventCar, 'driverName' | 'seats' | 'note'>;

/** The car has no free seat left. */
export class CarFullError extends Error {
  constructor(readonly driverId: string) {
    super(`car is full: ${driverId}`);
    this.name = 'CarFullError';
  }
}

/** The driver tried to offer fewer seats than riders already joined. */
export class SeatsBelowRidersError extends Error {
  constructor(readonly driverId: string) {
    super(`seats below the riders already in the car: ${driverId}`);
    this.name = 'SeatsBelowRidersError';
  }
}

const eventsCol = (gid: string) => collection(db, 'groups', gid, 'events').withConverter(idConverter<RideEvent>());
const carsCol = (gid: string, eid: string) =>
  collection(db, 'groups', gid, 'events', eid, 'cars').withConverter(plainConverter<EventCar>());
/** A car document id is its driver's uid: one car per member per event. */
const carRef = (gid: string, eid: string, driverId: string) =>
  doc(db, 'groups', gid, 'events', eid, 'cars', driverId).withConverter(plainConverter<EventCar>());

export async function createEvent(gid: string, input: CreateEventInput, createdBy: string): Promise<RideEvent> {
  const ref = doc(eventsCol(gid));
  const event: RideEvent = { ...input, id: ref.id, createdBy, createdAt: nowIso() };
  await setDoc(ref, event);
  return event;
}

export async function listEvents(gid: string): Promise<RideEvent[]> {
  const snap = await getDocs(query(eventsCol(gid), orderBy('date')));
  return snap.docs.map((d) => d.data());
}

export async function listCars(gid: string, eid: string): Promise<EventCar[]> {
  const snap = await getDocs(carsCol(gid, eid));
  return snap.docs.map((d) => d.data());
}

/** Create or update the caller's own car, keeping riders who already joined. */
export async function upsertMyCar(gid: string, eid: string, driverId: string, car: MyCarInput): Promise<void> {
  const ref = carRef(gid, eid, driverId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { ...car, driverId, riderIds: [] });
      return;
    }
    if (car.seats < snap.data().riderIds.length) throw new SeatsBelowRidersError(driverId);
    tx.update(ref, { ...car });
  });
}

/** Take a seat. Throws CarFullError when the last seat went first. */
export async function joinCar(gid: string, eid: string, driverId: string, uid: string): Promise<void> {
  const ref = carRef(gid, eid, driverId);
  await runTransaction(db, async (tx) => {
    const car = (await tx.get(ref)).data();
    if (car && !car.riderIds.includes(uid) && car.riderIds.length >= car.seats) throw new CarFullError(driverId);
    tx.update(ref, { riderIds: arrayUnion(uid) });
  });
}

export async function leaveCar(gid: string, eid: string, driverId: string, uid: string): Promise<void> {
  await updateDoc(carRef(gid, eid, driverId), { riderIds: arrayRemove(uid) });
}
