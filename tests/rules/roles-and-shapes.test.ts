import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CID, EID, GID, NOW, group, member, seed, startEnv } from './fixtures';

/** S-06..S-10, S-15: role hygiene, invite code format, event cars and document shapes. */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const memberDoc = (uid: string, target = uid) => as(uid).doc(`groups/${GID}/members/${target}`);
const carDoc = (uid: string, driver = 'alice') => as(uid).doc(`groups/${GID}/events/${EID}/cars/${driver}`);
const LONG = 'x'.repeat(81);

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('owner and admin roles', () => {
  it('denies the owner leaving their own group', async () => {
    await assertFails(memberDoc('owner').update({ status: 'left' }));
    await assertSucceeds(memberDoc('owner').update({ seats: 2 }));
  });

  it('denies a member setting an unknown status on themselves', async () => {
    await assertFails(memberDoc('alice').update({ status: 'banned' }));
  });

  it("denies an admin editing another member's profile fields", async () => {
    await assertFails(memberDoc('admin', 'alice').update({ displayName: 'x' }));
    await assertFails(memberDoc('admin', 'alice').update({ area: { lat: 0, lng: 0 } }));
  });

  it('denies an admin setting roles or statuses outside the enum', async () => {
    await assertFails(memberDoc('admin', 'alice').update({ role: 'superuser' }));
    await assertFails(memberDoc('admin', 'alice').update({ status: 'left' }));
    await assertFails(memberDoc('admin', 'alice').update({ status: 'banned' }));
  });

  it('lets an admin remove and restore a member', async () => {
    await assertSucceeds(memberDoc('admin', 'alice').update({ status: 'removed' }));
    await assertSucceeds(memberDoc('admin', 'alice').update({ status: 'active' }));
  });
});

describe('invite code format', () => {
  it('denies a group created with a weak or off-alphabet invite code', async () => {
    await assertFails(as('founder').doc('groups/g2').set(group({ ownerId: 'founder', inviteCode: 'A' })));
    await assertFails(as('founder').doc('groups/g2').set(group({ ownerId: 'founder', inviteCode: 'ABCDEFGO' })));
  });

  it('denies an admin setting a weak invite code', async () => {
    const db = as('admin');
    const batch = db.batch();
    batch.update(db.doc(`groups/${GID}`), { inviteCode: 'A' });
    batch.set(db.doc('inviteCodes/A'), { groupId: GID, groupName: 'Acme', createdBy: 'admin', createdAt: NOW });
    await assertFails(batch.commit());
    await assertFails(db.doc(`groups/${GID}`).update({ inviteCode: '' }));
  });

  it('denies a group without an allowedEmailDomains list', async () => {
    await assertFails(as('founder').doc('groups/g2').set(group({ ownerId: 'founder', allowedEmailDomains: 'corp.com' })));
  });
});

describe('event cars', () => {
  it('denies a driver enrolling riders', async () => {
    await assertFails(carDoc('alice').update({ riderIds: ['bob'] }));
    await assertFails(carDoc('bob', 'bob').set({ driverId: 'bob', driverName: 'bob', seats: 3, riderIds: ['carol'], note: '' }));
  });

  it('lets a driver drop a rider but not shrink seats below the riders', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc(`groups/${GID}/events/${EID}/cars/alice`).update({ riderIds: ['bob', 'carol'] }),
    );
    await assertFails(carDoc('alice').update({ seats: 1 }));
    await assertSucceeds(carDoc('alice').update({ riderIds: ['carol'] }));
  });

  it('denies a nonsensical seat count', async () => {
    await assertFails(carDoc('alice').update({ seats: -1 }));
    await assertFails(carDoc('alice').update({ seats: 'many' }));
  });
});

describe('events', () => {
  it('denies the creator reassigning createdBy', async () => {
    await assertFails(as('alice').doc(`groups/${GID}/events/${EID}`).update({ createdBy: 'bob' }));
    await assertSucceeds(as('alice').doc(`groups/${GID}/events/${EID}`).update({ place: 'Lobby' }));
  });

  it('denies an event with an oversized or missing title', async () => {
    const event = { title: LONG, date: '2026-11-08', time: '10:00', place: 'Park', createdBy: 'carol', createdAt: NOW };
    await assertFails(as('carol').doc(`groups/${GID}/events/e2`).set(event));
    await assertFails(as('carol').doc(`groups/${GID}/events/e2`).set({ ...event, title: 42 }));
  });
});

describe('document shapes', () => {
  it('denies a member writing malformed profile fields', async () => {
    await assertFails(memberDoc('alice').update({ displayName: 42 }));
    await assertFails(memberDoc('alice').update({ displayName: LONG }));
    await assertFails(memberDoc('alice').update({ seats: -1 }));
    await assertFails(memberDoc('alice').update({ area: 'home' }));
    await assertFails(memberDoc('alice').update({ extra: 'x' }));
  });

  it('denies joining with a malformed member document', async () => {
    await assertFails(memberDoc('newbie').set(member('newbie', 'member', { displayName: LONG })));
    await assertFails(memberDoc('newbie').set(member('newbie', 'member', { canDrive: 'yes' })));
  });

  it('denies malformed crew settings', async () => {
    const crew = as('alice').doc(`groups/${GID}/crews/${CID}`);
    await assertFails(crew.update({ pickupNote: 'x'.repeat(501) }));
    await assertFails(crew.update({ name: LONG }));
    await assertFails(crew.update({ waitLimitMin: -5 }));
    await assertFails(crew.update({ days: [1, 2, 3, 4, 5, 6, 7, 1] }));
  });
});
