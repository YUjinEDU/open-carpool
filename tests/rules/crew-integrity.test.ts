import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CID, GID, NOW, seed, startEnv } from './fixtures';

/** S-02 (a)-(d): who may change which crew fields. Crew c1 = alice (captain) + bob, active. */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const crewDoc = (uid: string, cid = CID) => as(uid).doc(`groups/${GID}/crews/${cid}`);
const PROPOSED = 'c2';

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
  // c2: alice proposed a crew with bob and carol; only alice accepted so far.
  await env.withSecurityRulesDisabled((ctx) =>
    ctx.firestore().doc(`groups/${GID}/crews/${PROPOSED}`).set({
      name: 'Evening', memberIds: ['alice', 'bob', 'carol'], captainId: 'alice', backupDriverIds: [],
      acceptedIds: ['alice'], status: 'proposed', days: [1], outTime: null, backTime: '18:00', pickupNote: '',
      waitLimitMin: 10, scores: { alice: 0, bob: 0, carol: 0 }, lastDroveOn: {}, createdBy: 'alice', createdAt: NOW,
    }),
  );
});

describe('accepting a crew', () => {
  it('lets a member accept for themselves', async () => {
    await assertSucceeds(crewDoc('bob', PROPOSED).update({ acceptedIds: ['alice', 'bob'] }));
  });

  it('denies a member accepting on behalf of others', async () => {
    await assertFails(crewDoc('bob', PROPOSED).update({ acceptedIds: ['alice', 'bob', 'carol'] }));
    await assertFails(crewDoc('bob', PROPOSED).update({ acceptedIds: [] }));
  });

  it('activates the crew only once every member accepted', async () => {
    await assertFails(crewDoc('bob', PROPOSED).update({ acceptedIds: ['alice', 'bob'], status: 'active' }));
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`groups/${GID}/crews/${PROPOSED}`).update({ acceptedIds: ['alice', 'bob'] }),
    );
    await assertSucceeds(crewDoc('carol', PROPOSED).update({ acceptedIds: ['alice', 'bob', 'carol'], status: 'active' }));
  });

  it('denies the captain activating a crew that not everyone accepted', async () => {
    await assertFails(crewDoc('alice', PROPOSED).update({ status: 'active' }));
  });
});

describe('crew settings', () => {
  it('lets the captain and admins edit settings and pause the crew', async () => {
    await assertSucceeds(crewDoc('alice').update({ name: 'Early', outTime: '07:30', pickupNote: 'gate 2' }));
    await assertSucceeds(crewDoc('admin').update({ status: 'paused' }));
    await assertSucceeds(crewDoc('alice').update({ status: 'active' }));
  });

  it('denies a crew member who is not the captain editing settings', async () => {
    await assertFails(crewDoc('bob').update({ name: 'Mine' }));
    await assertFails(crewDoc('bob').update({ status: 'paused' }));
  });

  it('denies changing provenance fields', async () => {
    await assertFails(crewDoc('admin').update({ createdBy: 'admin' }));
    await assertFails(crewDoc('alice').update({ createdAt: '2020-01-01T00:00:00.000Z' }));
  });
});

describe('crew membership', () => {
  it('denies a crew member who is not the captain rewriting memberIds', async () => {
    await assertFails(crewDoc('bob').update({ memberIds: ['bob', 'carol'], acceptedIds: ['alice'], status: 'proposed' }));
  });

  it('lets the captain change members when acceptance resets to the captain', async () => {
    await assertSucceeds(
      crewDoc('alice').update({ memberIds: ['alice', 'bob', 'carol'], acceptedIds: ['alice'], status: 'proposed' }),
    );
  });

  it('denies a membership change that keeps old acceptances or the active status', async () => {
    await assertFails(crewDoc('alice').update({ memberIds: ['alice', 'bob', 'carol'] }));
    await assertFails(crewDoc('alice').update({ memberIds: ['alice', 'carol'], acceptedIds: ['alice'], status: 'active' }));
  });

  it('denies a crew outside 2..6 members or without its captain', async () => {
    const seven = ['alice', 'bob', 'carol', 'd', 'e', 'f', 'g'];
    await assertFails(crewDoc('admin').update({ memberIds: seven, acceptedIds: ['alice'], status: 'proposed' }));
    await assertFails(crewDoc('alice').update({ memberIds: ['alice'], acceptedIds: ['alice'], status: 'proposed' }));
    await assertFails(crewDoc('admin').update({ memberIds: ['bob', 'carol'], acceptedIds: ['alice'], status: 'proposed' }));
  });
});

describe('crew captain', () => {
  it('lets the captain hand over to another crew member', async () => {
    await assertSucceeds(crewDoc('alice').update({ captainId: 'bob' }));
  });

  it('denies a non-captain taking over or a captain outside the crew', async () => {
    await assertFails(crewDoc('bob').update({ captainId: 'bob' }));
    await assertFails(crewDoc('alice').update({ captainId: 'carol' }));
  });

  it('lets an admin reassign the captain to a crew member', async () => {
    await assertSucceeds(crewDoc('admin').update({ captainId: 'bob' }));
  });
});

describe('declining a proposal', () => {
  it('lets an invited member drop only themselves from the proposal', async () => {
    await assertSucceeds(crewDoc('bob', PROPOSED).update({ memberIds: ['alice', 'carol'], acceptedIds: ['alice'], backupDriverIds: [] }));
  });

  it('denies dropping anyone else, the captain leaving, or declining an active crew', async () => {
    await assertFails(crewDoc('bob', PROPOSED).update({ memberIds: ['alice'], acceptedIds: ['alice'], backupDriverIds: [] }));
    await assertFails(crewDoc('bob', PROPOSED).update({ memberIds: ['alice', 'bob'], acceptedIds: ['alice'], backupDriverIds: [] }));
    await assertFails(crewDoc('alice', PROPOSED).update({ memberIds: ['bob', 'carol'], acceptedIds: [], backupDriverIds: [] }));
    await assertFails(crewDoc('bob').update({ memberIds: ['alice'], acceptedIds: ['alice'], backupDriverIds: [] }));
  });

  it('denies a decline that also touches other fields', async () => {
    await assertFails(crewDoc('bob', PROPOSED).update({ memberIds: ['alice', 'carol'], acceptedIds: ['alice'], backupDriverIds: [], name: 'Mine' }));
  });
});

describe('withdrawing a proposal', () => {
  const TWO = 'c3';
  beforeEach(async () => {
    // c3: alice proposed a two-person crew with bob.
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`groups/${GID}/crews/${TWO}`).set({
        name: 'Pair', memberIds: ['alice', 'bob'], captainId: 'alice', backupDriverIds: [],
        acceptedIds: ['alice'], status: 'proposed', days: [1], outTime: '08:00', backTime: null, pickupNote: '',
        waitLimitMin: 10, scores: { alice: 0, bob: 0 }, lastDroveOn: {}, createdBy: 'alice', createdAt: NOW,
      }),
    );
  });

  it('lets the captain or an admin delete a proposal that never ran', async () => {
    await assertSucceeds(crewDoc('alice', PROPOSED).delete());
    await assertSucceeds(crewDoc('admin', TWO).delete());
  });

  it('lets the other half of a two-person proposal decline by deleting it', async () => {
    await assertSucceeds(crewDoc('bob', TWO).delete());
  });

  it('denies a member of a larger proposal, a non-member, or anyone deleting an active crew', async () => {
    await assertFails(crewDoc('bob', PROPOSED).delete());
    await assertFails(crewDoc('carol', TWO).delete());
    await assertFails(crewDoc('alice').delete());
    await assertFails(crewDoc('admin').delete());
  });

  it('denies deleting a re-proposed crew that already has ledger history', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`groups/${GID}/crews/${TWO}`).update({ lastDroveOn: { alice: '2026-10-20' } }),
    );
    await assertFails(crewDoc('alice', TWO).delete());
  });
});
