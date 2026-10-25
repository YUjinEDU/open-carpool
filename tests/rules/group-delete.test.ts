import { assertFails, assertSucceeds, type RulesTestContext, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { APPLIED_TRIP, CID, CODE, EID, GID, NOW, TRIP, group, member, seed, startEnv, trip } from './fixtures';

/**
 * Two-phase group delete (V-02, V-03): the owner flags the group `deleting`, which freezes every write
 * under it, deletes the subcollections, then replaces the group with a tombstone that nothing may write.
 */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const g = `groups/${GID}`;
const NEW_CODE = 'BCDEFGHJ';

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

/** A write that bypasses the rules (fixture setup). */
const bypass = (write: (db: ReturnType<RulesTestContext['firestore']>) => Promise<unknown>) =>
  env.withSecurityRulesDisabled((ctx) => write(ctx.firestore()).then(() => undefined));
const markDeleting = () => bypass((db) => db.doc(g).update({ deleting: true }));
const tombstone = { deleted: true, deletedAt: NOW };

function crew(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Evening', memberIds: ['alice', 'carol'], captainId: 'alice', backupDriverIds: [], acceptedIds: ['alice'],
    status: 'proposed', days: [1], outTime: '08:00', backTime: '', pickupNote: '', waitLimitMin: 5,
    scores: { alice: 0, carol: 0 }, lastDroveOn: {}, createdBy: 'alice', createdAt: NOW, ...overrides,
  };
}
const event = { title: 'Offsite', date: '2026-11-02', time: '09:00', place: 'HQ', createdBy: 'alice', createdAt: NOW };

/** Settling TRIP (driver alice, rider bob): the trip flips applied and the crew ledger moves, in one batch. */
function settle(uid: string) {
  const db = as(uid);
  const batch = db.batch();
  batch.update(db.doc(`${g}/crews/${CID}/trips/${TRIP}`), { status: 'done', applied: true, completedBy: uid, completedAt: NOW });
  batch.update(db.doc(`${g}/crews/${CID}`), { scores: { alice: 30, bob: -30 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP });
  return batch.commit();
}

/** Every kind of create/update under a group; each succeeds on an open group (the control below). */
const writes: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ['owner renames the group', () => as('owner').doc(g).update({ name: 'Renamed' })],
  ['admin renames the group', () => as('admin').doc(g).update({ name: 'Renamed' })],
  ['owner edits their own member doc', () => as('owner').doc(`${g}/members/owner`).update({ seats: 2 })],
  ['admin promotes a member', () => as('admin').doc(`${g}/members/alice`).update({ role: 'admin' })],
  ['member edits their own member doc', () => as('alice').doc(`${g}/members/alice`).update({ seats: 1 })],
  ['invitee joins with the code', () => as('dave').doc(`${g}/members/dave`).set(member('dave', 'member'))],
  ['left member re-joins', async () => {
    await bypass((db) => db.doc(`${g}/members/carol`).update({ status: 'left' }));
    return as('carol').doc(`${g}/members/carol`).update({ status: 'active' });
  }],
  ['member proposes a crew', () => as('alice').doc(`${g}/crews/c2`).set(crew())],
  ['owner proposes a crew', () => as('owner').doc(`${g}/crews/c3`).set(crew({ memberIds: ['owner', 'carol'], captainId: 'owner', acceptedIds: ['owner'], scores: { owner: 0, carol: 0 }, createdBy: 'owner' }))],
  ['captain edits crew settings', () => as('alice').doc(`${g}/crews/${CID}`).update({ name: 'Late' })],
  ['member plans a trip', () => as('alice').doc(`${g}/crews/${CID}/trips/2026-10-27_out`).set(trip('2026-10-27'))],
  ['member marks a rider absent', () => as('alice').doc(`${g}/crews/${CID}/trips/${TRIP}`).update({ absentIds: ['bob'] })],
  ['member settles a trip (trip and crew ledger in one batch)', () => settle('alice')],
  ['admin settles a trip (crew ledger update through the admin path)', () => settle('admin')],
  ['member fills in the cost of a settled trip', () => as('alice').doc(`${g}/crews/${CID}/trips/${APPLIED_TRIP}`).update({ cost: { totalAmount: 12000, currency: 'KRW' } })],
  ['member creates an event', () => as('alice').doc(`${g}/events/e2`).set(event)],
  ['creator edits an event', () => as('alice').doc(`${g}/events/${EID}`).update({ title: 'Renamed' })],
  ['member offers a car', () => as('bob').doc(`${g}/events/${EID}/cars/bob`).set({ driverId: 'bob', driverName: 'bob', seats: 2, riderIds: [], note: '' })],
  ['rider joins a car', () => as('bob').doc(`${g}/events/${EID}/cars/alice`).update({ riderIds: ['bob'] })],
  ['owner rotates the invite code', () => {
    const db = as('owner');
    const batch = db.batch();
    batch.set(db.doc(`inviteCodes/${NEW_CODE}`), { id: NEW_CODE, groupId: GID, groupName: 'Acme', createdBy: 'owner', createdAt: NOW });
    batch.update(db.doc(g), { inviteCode: NEW_CODE });
    batch.delete(db.doc(`inviteCodes/${CODE}`));
    return batch.commit();
  }],
  ['owner transfers ownership', () => {
    const db = as('owner');
    const batch = db.batch();
    batch.update(db.doc(g), { ownerId: 'alice' });
    batch.update(db.doc(`${g}/members/alice`), { role: 'owner' });
    batch.update(db.doc(`${g}/members/owner`), { role: 'admin' });
    return batch.commit();
  }],
];

describe('phase 1: the deleting flag', () => {
  it('lets the owner flag the group as deleting', async () => {
    await assertSucceeds(as('owner').doc(g).update({ deleting: true }));
  });

  it('denies an admin, a member or a non-member flagging the group', async () => {
    await assertFails(as('admin').doc(g).update({ deleting: true }));
    await assertFails(as('alice').doc(g).update({ deleting: true }));
    await assertFails(as('stranger').doc(g).update({ deleting: true }));
  });

  it('denies the owner clearing the flag once set', async () => {
    await markDeleting();
    await assertFails(as('owner').doc(g).update({ deleting: false }));
  });

  it('denies creating a group that starts out deleting', async () => {
    await assertFails(as('dave').doc('groups/g2').set(group({ ownerId: 'dave', deleting: true })));
  });
});

describe('writes on an open group (control)', () => {
  it.each(writes)('allows: %s', async (_name, write) => {
    await assertSucceeds(write());
  });
});

describe('writes while the group is deleting', () => {
  it.each(writes)('denies: %s', async (_name, write) => {
    await markDeleting();
    await assertFails(write());
  });
});

describe('owner deletes outside a group delete (V-03)', () => {
  it('denies deleting a settled trip, a planned trip or an active crew', async () => {
    await assertFails(as('owner').doc(`${g}/crews/${CID}/trips/${APPLIED_TRIP}`).delete());
    await assertFails(as('owner').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
    await assertFails(as('owner').doc(`${g}/crews/${CID}`).delete());
  });

  it("denies hard-deleting a removed member's doc", async () => {
    await bypass((db) => db.doc(`${g}/members/carol`).update({ status: 'removed' }));
    await assertFails(as('owner').doc(`${g}/members/carol`).delete());
  });

  it("denies deleting another member's car or the group doc", async () => {
    await assertFails(as('owner').doc(`${g}/events/${EID}/cars/alice`).delete());
    await assertFails(as('owner').doc(g).delete());
  });

  it('keeps the non-owner deletes: an admin withdrawing a proposal, a driver removing their own car', async () => {
    await bypass((db) => db.doc(`${g}/crews/c2`).set(crew()));
    await assertSucceeds(as('admin').doc(`${g}/crews/c2`).delete());
    await assertSucceeds(as('alice').doc(`${g}/events/${EID}/cars/alice`).delete());
  });
});

describe('owner deletes while the group is deleting', () => {
  beforeEach(markDeleting);

  it('allows deleting trips, crews, cars, events, members and the invite code', async () => {
    const db = as('owner');
    const batch = db.batch();
    for (const tid of [TRIP, APPLIED_TRIP]) batch.delete(db.doc(`${g}/crews/${CID}/trips/${tid}`));
    batch.delete(db.doc(`${g}/crews/${CID}`));
    batch.delete(db.doc(`${g}/events/${EID}/cars/alice`));
    batch.delete(db.doc(`${g}/events/${EID}`));
    for (const m of ['admin', 'alice', 'bob', 'carol']) batch.delete(db.doc(`${g}/members/${m}`));
    batch.delete(db.doc(`inviteCodes/${CODE}`));
    await assertSucceeds(batch.commit());
  });

  it('denies an admin or a member deleting the group data', async () => {
    await assertFails(as('admin').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
    await assertFails(as('admin').doc(`${g}/members/alice`).delete());
    await assertFails(as('alice').doc(`${g}/members/bob`).delete());
  });
});

describe('tombstone', () => {
  /** The client's final batch: my membership goes together with the group becoming a tombstone. */
  function finish(uid: string, data: Record<string, unknown> = tombstone) {
    const db = as(uid);
    const batch = db.batch();
    batch.delete(db.doc(`${g}/members/${uid}`));
    batch.set(db.doc(g), data);
    return batch.commit();
  }

  it('lets the owner replace a deleting group with a tombstone', async () => {
    await markDeleting();
    await assertSucceeds(finish('owner'));
  });

  it('denies the tombstone before the deleting flag, from an admin, or with group fields kept', async () => {
    await assertFails(finish('owner'));
    await markDeleting();
    await assertFails(finish('admin'));
    await assertFails(finish('owner', { ...tombstone, name: 'Acme' }));
    await assertFails(finish('owner', { ...tombstone, inviteCode: CODE }));
  });

  describe('once written', () => {
    beforeEach(async () => {
      await markDeleting();
      await finish('owner');
    });

    it('is readable by any signed-in user, not by a signed-out one', async () => {
      await assertSucceeds(as('stranger').doc(g).get());
      await assertSucceeds(as('owner').doc(g).get());
      await assertFails(env.unauthenticatedContext().firestore().doc(g).get());
    });

    it('cannot be written again or deleted, by the former owner either', async () => {
      await assertFails(as('owner').doc(g).set({ deleted: true, deletedAt: '2026-12-01T00:00:00.000Z' }));
      await assertFails(as('owner').doc(g).delete());
      await assertFails(as('owner').doc(g).set(group()));
    });

    it('cannot be re-created by another user who knows the gid', async () => {
      await assertFails(as('alice').doc(g).set(group({ ownerId: 'alice' })));
      const db = as('alice');
      const batch = db.batch();
      batch.set(db.doc(g), group({ ownerId: 'alice' }));
      batch.set(db.doc(`${g}/members/alice`), member('alice', 'owner'));
      await assertFails(batch.commit());
    });
  });

  it('keeps a live group hidden from non-members', async () => {
    await assertFails(as('stranger').doc(g).get());
  });
});
