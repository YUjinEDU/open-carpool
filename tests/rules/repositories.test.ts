import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * End-to-end check of the src/data repositories against the emulators with the real rules:
 * the app's own `auth`/`db` (emulator mode) and real Auth emulator users.
 */
vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

const { auth } = await import('../../src/firebase');
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

async function become(name: 'ann' | 'ben'): Promise<string> {
  await signOut(auth);
  const { user } = await signInWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
  return user.uid;
}

beforeAll(async () => {
  for (const name of ['ann', 'ben'] as const) {
    const { user } = await createUserWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
    uids[name] = user.uid;
    defaultNames.push((await ensureUserProfile(user)).displayName);
  }
});

afterAll(async () => {
  await signOut(auth);
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
});
