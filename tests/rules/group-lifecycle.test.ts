import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { APPLIED_TRIP, CID, CODE, EID, GID, TRIP, seed, startEnv } from './fixtures';

/** Ownership transfer, the owner leaving after it, and deleting a whole group (owner only). */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const g = `groups/${GID}`;

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

/** One batch: group.ownerId -> to, members/to -> owner, members/from -> admin. */
function transfer(actor: string, from: string, to: string) {
  const db = as(actor);
  const batch = db.batch();
  batch.update(db.doc(g), { ownerId: to });
  batch.update(db.doc(`${g}/members/${to}`), { role: 'owner' });
  batch.update(db.doc(`${g}/members/${from}`), { role: 'admin' });
  return batch.commit();
}

describe('ownership transfer', () => {
  it('lets the owner hand the group to an active member in one batch', async () => {
    await assertSucceeds(transfer('owner', 'owner', 'alice'));
  });

  it('lets the former owner leave once the transfer is done', async () => {
    await assertSucceeds(transfer('owner', 'owner', 'alice'));
    await assertSucceeds(as('owner').doc(`${g}/members/owner`).update({ status: 'left' }));
    await assertFails(as('alice').doc(`${g}/members/alice`).update({ status: 'left' }));
  });

  it('denies a non-owner admin, a plain member or a non-member taking the group', async () => {
    await assertFails(transfer('admin', 'owner', 'admin'));
    await assertFails(transfer('alice', 'owner', 'alice'));
    await assertFails(transfer('stranger', 'owner', 'stranger'));
  });

  it('denies a transfer to a member who left or to someone outside the group', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`${g}/members/carol`).update({ status: 'left' }));
    await assertFails(transfer('owner', 'owner', 'carol'));
    const db = as('owner');
    const batch = db.batch();
    batch.update(db.doc(g), { ownerId: 'stranger' });
    batch.update(db.doc(`${g}/members/owner`), { role: 'admin' });
    await assertFails(batch.commit());
  });

  it('denies a half transfer: owner id, new owner role or old owner role alone', async () => {
    await assertFails(as('owner').doc(g).update({ ownerId: 'alice' }));
    await assertFails(as('owner').doc(`${g}/members/alice`).update({ role: 'owner' }));
    await assertFails(as('owner').doc(`${g}/members/owner`).update({ role: 'admin' }));
    const db = as('owner');
    const keepsOwner = db.batch();
    keepsOwner.update(db.doc(g), { ownerId: 'alice' });
    keepsOwner.update(db.doc(`${g}/members/alice`), { role: 'owner' });
    await assertFails(keepsOwner.commit());
  });
});

describe('group delete', () => {
  /** The client's order: crews (trips first), events (cars first), other members, invite code, then me + the group. */
  async function deleteGroupAs(uid: string): Promise<void> {
    const db = as(uid);
    const first = db.batch();
    for (const tid of [TRIP, APPLIED_TRIP]) first.delete(db.doc(`${g}/crews/${CID}/trips/${tid}`));
    first.delete(db.doc(`${g}/crews/${CID}`));
    first.delete(db.doc(`${g}/events/${EID}/cars/alice`));
    first.delete(db.doc(`${g}/events/${EID}`));
    for (const m of ['admin', 'alice', 'bob', 'carol']) first.delete(db.doc(`${g}/members/${m}`));
    first.delete(db.doc(`inviteCodes/${CODE}`));
    await first.commit();
    const last = db.batch();
    last.delete(db.doc(`${g}/members/${uid}`));
    last.delete(db.doc(g));
    await last.commit();
  }

  it('lets the owner delete the group with every subcollection', async () => {
    await assertSucceeds(deleteGroupAs('owner'));
  });

  it('denies a non-owner admin deleting the group or its data', async () => {
    await assertFails(as('admin').doc(g).delete());
    await assertFails(as('admin').doc(`${g}/members/alice`).delete());
    await assertFails(as('admin').doc(`${g}/crews/${CID}`).delete());
    await assertFails(as('admin').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
    await assertFails(as('admin').doc(`${g}/events/${EID}/cars/alice`).delete());
  });

  it('denies a plain member deleting the group or its data', async () => {
    await assertFails(as('alice').doc(g).delete());
    await assertFails(as('alice').doc(`${g}/members/bob`).delete());
    await assertFails(as('alice').doc(`${g}/crews/${CID}`).delete());
    await assertFails(as('alice').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
  });

  it('denies a non-member deleting the group or its data', async () => {
    await assertFails(as('stranger').doc(g).delete());
    await assertFails(as('stranger').doc(`${g}/members/alice`).delete());
    await assertFails(as('stranger').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
    await assertFails(as('stranger').doc(`${g}/events/${EID}`).delete());
  });

  it('denies the former owner deleting the group after a transfer', async () => {
    await assertSucceeds(transfer('owner', 'owner', 'alice'));
    await assertFails(as('owner').doc(`${g}/crews/${CID}/trips/${TRIP}`).delete());
    await assertFails(as('owner').doc(g).delete());
  });
});
