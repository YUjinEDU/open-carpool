import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PlanInput } from '../../src/domain/planning';
import type { Trip } from '../../src/domain/types';

/**
 * Trip writes that race other members, run through the src/data repositories against the emulators
 * with the real rules. Crew = ben (captain) + ann, both drivers, out leg on weekdays.
 */
vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

const { auth } = await import('../../src/firebase');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
const groups = await import('../../src/data/groups');
const members = await import('../../src/data/members');
const crews = await import('../../src/data/crews');
const trips = await import('../../src/data/trips');
const { syncCrewPlan } = await import('../../src/features/trips/syncPlan');

type Name = 'ann' | 'ben';
const run = Math.random().toString(36).slice(2, 8);
const PASSWORD = 'emulator-only-pw';
const uids: Record<Name, string> = { ann: '', ben: '' };
const MON = '2030-01-07';
const TUE = '2030-01-08';
const RANGE = { from: MON, to: TUE };

async function become(name: Name): Promise<string> {
  await signOut(auth);
  const { user } = await signInWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
  return user.uid;
}
const nameOf = (uid: string | null): Name => (uid === uids.ann ? 'ann' : 'ben');
const other = (uid: string | null): string => (uid === uids.ann ? uids.ben : uids.ann);

async function activeCrew(): Promise<{ readonly gid: string; readonly cid: string }> {
  const ann = await become('ann');
  const group = await groups.createGroup(
    {
      name: `Race ${run}`, type: 'company', country: 'KR', locale: 'ko', allowedEmailDomains: [], destination: null,
      policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
    },
    { uid: ann, displayName: 'Ann' },
  );
  await members.updateMyMember(group.id, ann, { canDrive: true, seats: 3 });
  const ben = await become('ben');
  await groups.joinGroup(group.inviteCode, { uid: ben, displayName: 'Ben' });
  await members.updateMyMember(group.id, ben, { canDrive: true, seats: 3 });
  const crew = await crews.createCrew(
    group.id,
    {
      name: 'Morning', memberIds: [ben, ann], captainId: ben, backupDriverIds: [], days: [1, 2, 3, 4, 5],
      outTime: '08:00', backTime: null, pickupNote: '', waitLimitMin: 10,
    },
    ben,
  );
  await become('ann');
  await crews.acceptCrew(group.id, crew.id, ann);
  return { gid: group.id, cid: crew.id };
}

async function planFor(gid: string, cid: string, existing: readonly Trip[]): Promise<PlanInput> {
  const [group, crewList, memberList] = await Promise.all([groups.getGroup(gid), crews.listCrews(gid), members.listMembers(gid)]);
  const crew = crewList.find((c) => c.id === cid);
  if (!group || !crew) throw new Error('fixture group or crew missing');
  return { crew, members: memberList, from: MON, days: 2, existing, now: new Date(), tz: 'Asia/Seoul', policy: group.policy };
}

async function tripOn(gid: string, cid: string, id: string): Promise<Trip | undefined> {
  return (await trips.listTrips(gid, cid, RANGE)).find((t) => t.id === id);
}

beforeAll(async () => {
  for (const name of ['ann', 'ben'] as const) {
    const { user } = await createUserWithEmailAndPassword(auth, `${name}-${run}@example.com`, PASSWORD);
    uids[name] = user.uid;
  }
});

afterAll(async () => {
  await signOut(auth);
  vi.unstubAllEnvs();
});

describe('planner writes from a stale snapshot', () => {
  it('keeps an absence marked after the planner took its snapshot', async () => {
    const { gid, cid } = await activeCrew();
    const stale = await trips.listTrips(gid, cid, RANGE);
    await syncCrewPlan({ gid, plan: await planFor(gid, cid, stale) });
    await trips.markAbsent(gid, cid, `${MON}_out`, uids.ann, true);

    await syncCrewPlan({ gid, plan: await planFor(gid, cid, stale) });

    const mon = await tripOn(gid, cid, `${MON}_out`);
    expect(mon?.absentIds).toEqual([uids.ann]);
    expect(mon?.driverId).toBe(uids.ben);
    expect(mon?.riderIds).toEqual([]);
  });

  it('keeps a volunteer who took the trip after the planner took its snapshot', async () => {
    const { gid, cid } = await activeCrew();
    await syncCrewPlan({ gid, plan: await planFor(gid, cid, []) });
    const planned = await tripOn(gid, cid, `${TUE}_out`);
    const driver = planned?.driverId ?? null;
    await become(nameOf(driver));
    await trips.giveUpDriving(gid, cid, `${TUE}_out`);
    const stale = await trips.listTrips(gid, cid, RANGE);
    const volunteer = other(driver);
    await become(nameOf(volunteer));
    await trips.volunteerToDrive(gid, cid, `${TUE}_out`, volunteer);

    await syncCrewPlan({ gid, plan: await planFor(gid, cid, stale) });

    expect(await tripOn(gid, cid, `${TUE}_out`)).toMatchObject({ driverId: volunteer, status: 'planned' });
  });
});
