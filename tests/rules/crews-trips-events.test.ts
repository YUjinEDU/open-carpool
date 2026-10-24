import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { APPLIED_TRIP, CID, EID, GID, NOW, TRIP, seed, startEnv, trip } from './fixtures';

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const crews = (uid: string) => as(uid).collection(`groups/${GID}/crews`);
const tripDoc = (uid: string, id = TRIP) => as(uid).doc(`groups/${GID}/crews/${CID}/trips/${id}`);
const carDoc = (uid: string, driver = 'alice') => as(uid).doc(`groups/${GID}/events/${EID}/cars/${driver}`);

const newCrew = (createdBy: string, memberIds: string[]) => ({
  name: 'Evening',
  memberIds,
  captainId: createdBy,
  backupDriverIds: [],
  acceptedIds: [createdBy],
  status: 'proposed',
  days: [1, 3],
  outTime: null,
  backTime: '18:30',
  pickupNote: '',
  waitLimitMin: 10,
  scores: Object.fromEntries(memberIds.map((id) => [id, 0])),
  lastDroveOn: {},
  createdBy,
  createdAt: NOW,
});

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('crews', () => {
  it('lets members read crews and denies non-members', async () => {
    await assertSucceeds(crews('carol').get());
    await assertFails(crews('stranger').get());
    await assertFails(crews('stranger').doc(CID).get());
  });

  it('lets a member create a crew that includes them', async () => {
    await assertSucceeds(crews('carol').doc('c2').set(newCrew('carol', ['carol', 'alice'])));
  });

  it('denies a crew without the creator or with a bad size', async () => {
    await assertFails(crews('carol').doc('c2').set(newCrew('carol', ['alice', 'bob'])));
    await assertFails(crews('carol').doc('c2').set(newCrew('carol', ['carol'])));
    await assertFails(crews('carol').doc('c2').set(newCrew('carol', ['carol', 'a', 'b', 'c', 'd', 'e', 'f'])));
  });

  it('lets crew members and admins update a crew, not other members', async () => {
    await assertSucceeds(crews('bob').doc(CID).update({ acceptedIds: ['alice', 'bob'] }));
    await assertSucceeds(crews('admin').doc(CID).update({ status: 'paused' }));
    await assertFails(crews('carol').doc(CID).update({ status: 'paused' }));
  });
});

describe('trips', () => {
  it('lets group members read trips and denies non-members', async () => {
    await assertSucceeds(tripDoc('carol').get());
    await assertFails(tripDoc('stranger').get());
  });

  it('lets crew members and admins write trips', async () => {
    await assertSucceeds(tripDoc('bob').update({ absentIds: ['bob'] }));
    await assertSucceeds(tripDoc('admin').update({ driverId: null, status: 'needs_driver' }));
    await assertSucceeds(tripDoc('alice', '2026-10-27_out').set(trip('2026-10-27')));
  });

  it('denies a group member outside the crew writing trips', async () => {
    await assertFails(tripDoc('carol').update({ absentIds: ['carol'] }));
    await assertFails(tripDoc('carol', '2026-10-27_out').set(trip('2026-10-27')));
  });

  it('completes a trip and updates crew scores in one transaction', async () => {
    const db = as('alice');
    const batch = db.batch();
    batch.update(db.doc(`groups/${GID}/crews/${CID}/trips/${TRIP}`), {
      status: 'done', applied: true, completedBy: 'alice', completedAt: NOW,
    });
    batch.update(db.doc(`groups/${GID}/crews/${CID}`), {
      scores: { alice: 30, bob: -30 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP,
    });
    await assertSucceeds(batch.commit());
  });

  it('denies un-applying an applied trip', async () => {
    await assertFails(tripDoc('alice', APPLIED_TRIP).update({ applied: false, status: 'planned' }));
    await assertFails(tripDoc('admin', APPLIED_TRIP).update({ applied: false }));
  });

  it('freezes an applied trip except for its cost', async () => {
    await assertFails(tripDoc('alice', APPLIED_TRIP).update({ driverId: 'bob' }));
    await assertFails(tripDoc('admin', APPLIED_TRIP).update({ riderIds: [] }));
    await assertSucceeds(tripDoc('alice', APPLIED_TRIP).update({ cost: { totalAmount: 12, currency: 'USD' } }));
  });

  const seedTrip = (patch: Record<string, unknown>) =>
    env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`groups/${GID}/crews/${CID}/trips/${TRIP}`).update(patch));

  it('lets a crew member volunteer for a trip without a driver, only as themselves', async () => {
    await seedTrip({ driverId: null, status: 'needs_driver', riderIds: ['alice', 'bob'] });
    await assertFails(tripDoc('bob').update({ driverId: 'alice', status: 'planned', riderIds: ['bob'] }));
    await assertSucceeds(tripDoc('bob').update({ driverId: 'bob', status: 'planned', riderIds: ['alice'] }));
  });

  it('denies taking over a trip whose driver is still present', async () => {
    await assertFails(tripDoc('bob').update({ driverId: 'bob', riderIds: ['alice'] }));
  });

  it('lets only the driver give up driving', async () => {
    await assertFails(tripDoc('bob').update({ driverId: null, status: 'needs_driver' }));
    await assertSucceeds(tripDoc('alice').update({ driverId: null, status: 'needs_driver', riderIds: ['bob', 'alice'] }));
  });

  it('lets the planner replace a driver who is absent, left the crew or stopped driving', async () => {
    await seedTrip({ absentIds: ['alice'] });
    await assertSucceeds(tripDoc('bob').update({ driverId: 'bob', riderIds: [] }));
    await seedTrip({ driverId: 'carol', absentIds: [] });
    await assertSucceeds(tripDoc('bob').update({ driverId: 'alice', riderIds: ['bob'] }));
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`groups/${GID}/members/alice`).update({ canDrive: false }));
    await assertSucceeds(tripDoc('bob').update({ driverId: null, status: 'needs_driver', riderIds: ['alice', 'bob'] }));
  });

  it('denies the planner naming a driver from outside the crew', async () => {
    await seedTrip({ absentIds: ['alice'] });
    await assertFails(tripDoc('bob').update({ driverId: 'carol' }));
  });

  it('denies deleting trips', async () => {
    await assertFails(tripDoc('alice').delete());
  });
});

describe('events and cars', () => {
  it('lets members create and read events, denies non-members', async () => {
    const event = { title: 'Picnic', date: '2026-11-08', time: '10:00', place: 'Park', createdBy: 'carol', createdAt: NOW };
    await assertSucceeds(as('carol').doc(`groups/${GID}/events/e2`).set(event));
    await assertFails(as('stranger').doc(`groups/${GID}/events/${EID}`).get());
    await assertFails(as('stranger').doc(`groups/${GID}/events/e3`).set({ ...event, createdBy: 'stranger' }));
  });

  it('lets a driver manage only their own car', async () => {
    await assertSucceeds(carDoc('bob', 'bob').set({ driverId: 'bob', driverName: 'bob', seats: 3, riderIds: [], note: '' }));
    await assertSucceeds(carDoc('alice').update({ seats: 4 }));
    await assertFails(carDoc('bob').update({ seats: 1 }));
    await assertFails(carDoc('bob', 'alice').set({ driverId: 'alice', driverName: 'x', seats: 3, riderIds: [], note: '' }));
  });

  it('lets a member join and leave a car with their own uid only', async () => {
    await assertSucceeds(carDoc('bob').update({ riderIds: ['bob'] }));
    await assertSucceeds(carDoc('carol').update({ riderIds: ['bob', 'carol'] }));
    await assertFails(carDoc('admin').update({ riderIds: ['bob', 'carol', 'admin'] })); // over seats (2)
    await assertFails(carDoc('carol').update({ riderIds: ['carol'] })); // removes bob
    await assertSucceeds(carDoc('bob').update({ riderIds: ['carol'] }));
  });

  it('denies adding someone else to a car', async () => {
    await assertFails(carDoc('bob').update({ riderIds: ['carol'] }));
  });
});
