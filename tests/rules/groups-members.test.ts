import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CODE, GID, NOW, group, member, seed, startEnv } from './fixtures';

let env: RulesTestEnvironment;
const as = (uid: string, token: { email?: string; email_verified?: boolean } = {}) =>
  env.authenticatedContext(uid, token).firestore();
const groupDoc = (uid: string) => as(uid).doc(`groups/${GID}`);
const memberDoc = (uid: string, target = uid) => as(uid).doc(`groups/${GID}/members/${target}`);

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('groups', () => {
  it('creates group + owner member + invite code in one batch', async () => {
    const db = as('founder');
    const batch = db.batch();
    batch.set(db.doc('groups/g2'), group({ ownerId: 'founder', inviteCode: 'NEWGROUP' }));
    batch.set(db.doc('groups/g2/members/founder'), member('founder', 'owner', { inviteCode: 'NEWGROUP' }));
    batch.set(db.doc('inviteCodes/NEWGROUP'), { groupId: 'g2', groupName: 'Acme', createdBy: 'founder', createdAt: NOW });
    await assertSucceeds(batch.commit());
  });

  it('denies creating a group owned by someone else', async () => {
    await assertFails(as('founder').doc('groups/g2').set(group({ ownerId: 'alice' })));
  });

  it('lets active members read the group', async () => {
    await assertSucceeds(groupDoc('alice').get());
  });

  it('denies a non-member reading the group or its members', async () => {
    await assertFails(groupDoc('stranger').get());
    await assertFails(as('stranger').collection(`groups/${GID}/members`).get());
    await assertFails(memberDoc('stranger', 'alice').get());
  });

  it('denies a member who left reading the group', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`groups/${GID}/members/carol`).update({ status: 'left' }));
    await assertFails(groupDoc('carol').get());
  });

  it('lets an admin update the group but not change its owner', async () => {
    await assertSucceeds(groupDoc('admin').update({ name: 'Acme Carpool' }));
    await assertFails(groupDoc('admin').update({ ownerId: 'admin' }));
  });

  it('denies a plain member updating the group', async () => {
    await assertFails(groupDoc('alice').update({ name: 'Mine now' }));
  });

  it('lets a user query their own memberships across groups', async () => {
    await assertSucceeds(
      as('alice').collectionGroup('members').where('uid', '==', 'alice').where('status', '==', 'active').get(),
    );
  });
});

describe('joining', () => {
  it('lets a user join with the current invite code', async () => {
    await assertSucceeds(memberDoc('newbie').set(member('newbie', 'member')));
  });

  it('denies joining with a wrong invite code', async () => {
    await assertFails(memberDoc('newbie').set(member('newbie', 'member', { inviteCode: 'WRONGCOD' })));
  });

  it('denies joining as admin or owner, or creating someone else', async () => {
    await assertFails(memberDoc('newbie').set(member('newbie', 'admin')));
    await assertFails(memberDoc('newbie').set(member('newbie', 'owner')));
    await assertFails(memberDoc('newbie', 'other').set(member('other', 'member')));
  });

  describe('with allowed email domains', () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled((ctx) =>
        ctx.firestore().doc(`groups/${GID}`).update({ allowedEmailDomains: ['corp.com'] }),
      );
    });

    it('lets a verified matching email join', async () => {
      const db = as('newbie', { email: 'newbie@Corp.com', email_verified: true });
      await assertSucceeds(db.doc(`groups/${GID}/members/newbie`).set(member('newbie', 'member')));
    });

    it('denies an email domain that is not allowed', async () => {
      const db = as('newbie', { email: 'newbie@gmail.com', email_verified: true });
      await assertFails(db.doc(`groups/${GID}/members/newbie`).set(member('newbie', 'member')));
    });

    it('denies an unverified email even on an allowed domain', async () => {
      const db = as('newbie', { email: 'newbie@corp.com', email_verified: false });
      await assertFails(db.doc(`groups/${GID}/members/newbie`).set(member('newbie', 'member')));
    });
  });
});

describe('member updates', () => {
  it('lets a member edit their own profile fields and leave', async () => {
    await assertSucceeds(memberDoc('alice').update({ seats: 4, areaLabel: 'Gangnam' }));
    await assertSucceeds(memberDoc('alice').update({ status: 'left' }));
  });

  it('denies a member setting their own role to admin', async () => {
    await assertFails(memberDoc('alice').update({ role: 'admin' }));
  });

  it('denies a member changing their inviteCode or editing another member', async () => {
    await assertFails(memberDoc('alice').update({ inviteCode: 'ZZZZZZZZ' }));
    await assertFails(memberDoc('alice', 'bob').update({ seats: 0 }));
  });

  it('lets an admin promote and demote members', async () => {
    await assertSucceeds(memberDoc('admin', 'alice').update({ role: 'admin' }));
    await assertSucceeds(memberDoc('admin', 'alice').update({ role: 'member' }));
  });

  it('denies an admin making someone owner', async () => {
    await assertFails(memberDoc('admin', 'alice').update({ role: 'owner' }));
    await assertFails(memberDoc('owner', 'alice').update({ role: 'owner' }));
  });

  it("denies an admin changing the owner's role", async () => {
    await assertFails(memberDoc('admin', 'owner').update({ role: 'member' }));
  });

  it('keeps the original invite code valid for members after rotation', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`groups/${GID}`).update({ inviteCode: 'ROTATED2' }));
    await assertSucceeds(memberDoc('alice').update({ seats: 1 }));
    await assertFails(memberDoc('late').set(member('late', 'member', { inviteCode: CODE })));
  });
});
