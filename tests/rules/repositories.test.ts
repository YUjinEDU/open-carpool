import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { startEnv } from './fixtures';

// One-shot hook that runs right after the next batch the app commits: a write landing between delete passes.
const batchHook = vi.hoisted(() => ({ afterNextCommit: null as null | (() => Promise<void>) }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const real = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...real,
    writeBatch: (...args: Parameters<typeof real.writeBatch>) => {
      const batch = real.writeBatch(...args);
      const commit = batch.commit.bind(batch);
      batch.commit = async () => {
        await commit();
        const hook = batchHook.afterNextCommit;
        batchHook.afterNextCommit = null;
        if (hook) await hook();
      };
      return batch;
    },
  };
});

/**
 * End-to-end check of the src/data repositories against the emulators with the real rules:
 * the app's own `auth`/`db` (emulator mode) and real Auth emulator users.
 */
vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

const { auth, db } = await import('../../src/firebase');
const { deleteDoc, doc, setDoc, updateDoc } = await import('firebase/firestore');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
const { ensureUserProfile } = await import('../../src/features/auth/authService');
const groups = await import('../../src/data/groups');
const members = await import('../../src/data/members');
const crews = await import('../../src/data/crews');
const trips = await import('../../src/data/trips');
const events = await import('../../src/data/events');
const { MAX_CREW_SIZE } = await import('../../src/domain/types');

const run = Math.random().toString(36).slice(2, 8);
const PASSWORD = 'emulator-only-pw';
const uids: Record<'ann' | 'ben', string> = { ann: '', ben: '' };
const defaultNames: string[] = [];
let rulesEnv: RulesTestEnvironment;

async function become(name: 'ann' | 'ben'): Promise<string> {
  await signOut(auth);
  const { user } = await signInWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
  return user.uid;
}

beforeAll(async () => {
  rulesEnv = await startEnv();
  for (const name of ['ann', 'ben'] as const) {
    const { user } = await createUserWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
    uids[name] = user.uid;
    defaultNames.push((await ensureUserProfile(user)).displayName);
  }
});

afterAll(async () => {
  await signOut(auth);
  await rulesEnv.cleanup();
  vi.unstubAllEnvs();
});

describe('first sign-in profile', () => {
  it('does not default the display name to the email local part', () => {
    expect(defaultNames).toHaveLength(2);
    for (const name of defaultNames) {
      expect(name).not.toMatch(/ann|ben/);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe('repositories under security rules', () => {
  it('runs create group -> join -> crew -> plan -> complete once', async () => {
    const ann = await become('ann');
    const group = await groups.createGroup(
      {
        name: `Repo ${run}`,
        type: 'company',
        country: 'KR',
        locale: 'ko',
        allowedEmailDomains: [],
        destination: null,
        policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
      },
      { uid: ann, displayName: 'Ann' },
    );
    expect(group.inviteCode).toMatch(new RegExp(`^[${groups.INVITE_ALPHABET}]{${groups.INVITE_CODE_LENGTH}}$`));

    const ben = await become('ben');
    expect(await groups.joinGroup(group.inviteCode.toLowerCase(), { uid: ben, displayName: 'Ben' })).toBe(group.id);
    expect((await groups.listMyGroups(ben)).map((g) => g.id)).toContain(group.id);
    await members.updateMyMember(group.id, ben, { canDrive: true, seats: 3 });

    const crew = await crews.createCrew(
      group.id,
      {
        name: 'Morning', memberIds: [ben, ann], captainId: ben, backupDriverIds: [], days: [1, 2, 3, 4, 5],
        outTime: '08:00', backTime: null, pickupNote: '', waitLimitMin: 10,
      },
      ben,
    );
    expect(crew.memberIds.length).toBeLessThanOrEqual(MAX_CREW_SIZE);

    await become('ann');
    expect((await crews.acceptCrew(group.id, crew.id, ann)).status).toBe('active');
    const planned = {
      id: '2026-10-26_out', date: '2026-10-26', leg: 'out' as const, driverId: ann, riderIds: [ben],
      absentIds: [], status: 'planned' as const, applied: false, completedBy: null, completedAt: null, cost: null,
    };
    const planWrite = { ids: [planned.id], writesFor: () => [planned] };
    await trips.upsertPlannedTrips(group.id, crew.id, planWrite);
    const scores = await trips.completeTrip(group.id, crew.id, planned.id, { driverId: ann, riderIds: [ben] }, ann);
    expect(scores).toEqual({ [ann]: 30, [ben]: -30 });
    await expect(
      trips.completeTrip(group.id, crew.id, planned.id, { driverId: ann, riderIds: [ben] }, ann),
    ).rejects.toBeInstanceOf(trips.TripAlreadyAppliedError);

    await trips.upsertPlannedTrips(group.id, crew.id, planWrite); // must not reset a done trip
    const [stored] = await trips.listTrips(group.id, crew.id, { from: '2026-10-26', to: '2026-10-26' });
    expect(stored?.applied).toBe(true);

    const newCode = await groups.rotateInviteCode(group.id, ann);
    expect(await groups.lookupInvite(group.inviteCode)).toBeNull();
    expect((await groups.lookupInvite(newCode))?.groupId).toBe(group.id);

    const event = await events.createEvent(group.id, { title: 'Offsite', date: '2026-11-01', time: '09:00', place: 'HQ' }, ann);
    await events.upsertMyCar(group.id, event.id, ann, { driverName: 'Ann', seats: 3, note: '' });
    await become('ben');
    await events.joinCar(group.id, event.id, ann, ben);
    expect((await events.listCars(group.id, event.id))[0]?.riderIds).toEqual([ben]);

    await events.upsertMyCar(group.id, event.id, ben, { driverName: 'Ben', seats: 0, note: '' });
    await become('ann');
    await expect(events.upsertMyCar(group.id, event.id, ann, { driverName: 'Ann', seats: 0, note: '' })).rejects.toBeInstanceOf(
      events.SeatsBelowRidersError,
    );
    await expect(events.joinCar(group.id, event.id, ben, ann)).rejects.toBeInstanceOf(events.CarFullError);
  });

  it('transfers ownership, lets the old owner leave, and deletes the group with its data', async () => {
    const ann = await become('ann');
    const group = await groups.createGroup(
      {
        name: `Lifecycle ${run}`, type: 'club', country: 'KR', locale: 'ko', allowedEmailDomains: [], destination: null,
        policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
      },
      { uid: ann, displayName: 'Ann' },
    );
    const ben = await become('ben');
    await groups.joinGroup(group.inviteCode, { uid: ben, displayName: 'Ben' });
    await members.updateMyMember(group.id, ben, { canDrive: true, seats: 3 });
    const crew = await crews.createCrew(
      group.id,
      { name: 'Evening', memberIds: [ben, ann], captainId: ben, backupDriverIds: [], days: [1], outTime: '08:00', backTime: null, pickupNote: '', waitLimitMin: 5 },
      ben,
    );
    const planned = {
      id: '2026-10-26_out', date: '2026-10-26', leg: 'out' as const, driverId: ben, riderIds: [ann],
      absentIds: [], status: 'planned' as const, applied: false, completedBy: null, completedAt: null, cost: null,
    };
    await trips.upsertPlannedTrips(group.id, crew.id, { ids: [planned.id], writesFor: () => [planned] });
    const event = await events.createEvent(group.id, { title: 'Picnic', date: '2026-11-01', time: '10:00', place: 'Park' }, ben);
    await events.upsertMyCar(group.id, event.id, ben, { driverName: 'Ben', seats: 2, note: '' });
    await expect(groups.deleteGroup(group, ben)).rejects.toThrow();

    await become('ann');
    await groups.transferOwnership(group.id, ann, ben);
    expect((await groups.getGroup(group.id))?.ownerId).toBe(ben);
    expect((await members.getMember(group.id, ben))?.role).toBe('owner');
    await members.leaveGroup(group.id, ann);

    await become('ben');
    await groups.deleteGroup(group, ben);
    expect((await groups.listMyGroups(ben)).map((g) => g.id)).not.toContain(group.id);
    expect(await groups.lookupInvite(group.inviteCode)).toBeNull();
    expect(await groups.readGroup(group.id)).toMatchObject({ id: group.id, deleted: true });
    expect(await groups.getGroup(group.id)).toBeNull();
    await groups.deleteGroup(group, ben); // a second run finds the tombstone and does nothing

    // The gid stays taken: a former member cannot re-create the group as its owner.
    await become('ann');
    const { id: _id, ...fields } = group;
    await expect(setDoc(doc(db, 'groups', group.id), { ...fields, ownerId: ann })).rejects.toThrow();
  });

  async function groupWithMember(label: string) {
    const ann = await become('ann');
    const group = await groups.createGroup(
      {
        name: `${label} ${run}`, type: 'club', country: 'KR', locale: 'ko', allowedEmailDomains: [], destination: null,
        policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
      },
      { uid: ann, displayName: 'Ann' },
    );
    const ben = await become('ben');
    await groups.joinGroup(group.inviteCode, { uid: ben, displayName: 'Ben' });
    await become('ann');
    return { ann, ben, group };
  }

  it('deletes a group whose invite code was rotated after the caller loaded it (V-01)', async () => {
    const { ann, group } = await groupWithMember('Rotated');
    const newCode = await groups.rotateInviteCode(group.id, ann);
    await groups.deleteGroup(group, ann); // `group` still carries the old code
    expect(await groups.readGroup(group.id)).toMatchObject({ deleted: true });
    expect(await groups.lookupInvite(newCode)).toBeNull();
  });

  it('finishes a delete on retry after a run that stopped before the last batch (V-01)', async () => {
    const { ann, ben, group } = await groupWithMember('Retry');
    // What a run leaves when every batch but the last committed: flagged, other members and invite gone.
    await updateDoc(doc(db, 'groups', group.id), { deleting: true });
    await deleteDoc(doc(db, 'groups', group.id, 'members', ben));
    await deleteDoc(doc(db, 'inviteCodes', group.inviteCode));
    await groups.deleteGroup(group, ann);
    expect(await groups.readGroup(group.id)).toMatchObject({ deleted: true });
    expect(await members.getMember(group.id, ann)).toBeNull();
  });

  it('also deletes a crew and its trip written after the first delete pass (W-02)', async () => {
    const { ann, group } = await groupWithMember('Late write');
    const g = `groups/${group.id}`;
    // A write whose rule check ran before the freeze but which committed after the first listing.
    batchHook.afterNextCommit = () =>
      rulesEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc(`${g}/crews/late`).set({ name: 'Late' });
        await ctx.firestore().doc(`${g}/crews/late/trips/2026-10-27_out`).set({ date: '2026-10-27' });
      });
    await groups.deleteGroup(group, ann);
    expect(batchHook.afterNextCommit).toBeNull(); // the late write did land between passes
    expect(await groups.readGroup(group.id)).toMatchObject({ deleted: true });
    let left: readonly boolean[] = [];
    await rulesEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const [crew, trip] = await Promise.all([db.doc(`${g}/crews/late`).get(), db.doc(`${g}/crews/late/trips/2026-10-27_out`).get()]);
      left = [crew.exists, trip.exists];
    });
    expect(left).toEqual([false, false]);
  });
});
