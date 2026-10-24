import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CODE, GID, NOW, seed, startEnv } from './fixtures';

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('users', () => {
  it('lets a user read and write their own profile', async () => {
    await assertSucceeds(as('alice').doc('users/alice').get());
    await assertSucceeds(as('alice').doc('users/alice').set({ displayName: 'Alice' }, { merge: true }));
  });

  it("denies reading another user's profile", async () => {
    await assertFails(as('bob').doc('users/alice').get());
  });

  it('denies writing another user profile and unauthenticated access', async () => {
    await assertFails(as('bob').doc('users/alice').set({ displayName: 'x' }, { merge: true }));
    await assertFails(env.unauthenticatedContext().firestore().doc('users/alice').get());
  });
});

describe('inviteCodes', () => {
  it('lets any signed-in user get a code by id', async () => {
    await assertSucceeds(as('stranger').doc(`inviteCodes/${CODE}`).get());
  });

  it('denies listing invite codes', async () => {
    await assertFails(as('stranger').collection('inviteCodes').get());
    await assertFails(as('owner').collection('inviteCodes').get());
  });

  it('denies unauthenticated get', async () => {
    await assertFails(env.unauthenticatedContext().firestore().doc(`inviteCodes/${CODE}`).get());
  });

  it('lets an admin rotate the code atomically', async () => {
    const db = as('admin');
    const batch = db.batch();
    batch.set(db.doc('inviteCodes/NEWCODE2'), { groupId: GID, groupName: 'Acme', createdBy: 'admin', createdAt: NOW });
    batch.update(db.doc(`groups/${GID}`), { inviteCode: 'NEWCODE2' });
    batch.delete(db.doc(`inviteCodes/${CODE}`));
    await assertSucceeds(batch.commit());
  });

  it('denies a plain member creating or deleting codes', async () => {
    const db = as('alice');
    await assertFails(db.doc('inviteCodes/NEWCODE2').set({ groupId: GID, groupName: 'Acme', createdBy: 'alice', createdAt: NOW }));
    await assertFails(db.doc(`inviteCodes/${CODE}`).delete());
  });

  it('denies an admin creating a code that is not the group code', async () => {
    await assertFails(
      as('admin').doc('inviteCodes/SIDECODE').set({ groupId: GID, groupName: 'Acme', createdBy: 'admin', createdAt: NOW }),
    );
  });
});
