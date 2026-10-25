import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { CID, GID, TRIP, seed, startEnv, trip } from './fixtures';

/**
 * The planner replaces a driver whose plate may not drive on the trip's date.
 * TRIP is Monday 2026-10-26 (even day); alice drives, bob rides.
 */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const SATURDAY = '2026-10-31_out';
const SUNDAY = '2026-11-01_out';
const tripDoc = (uid: string, id = TRIP) => as(uid).doc(`groups/${GID}/crews/${CID}/trips/${id}`);
const replan = (uid: string, id = TRIP) => tripDoc(uid, id).update({ driverId: 'bob', riderIds: ['alice'] });

async function setPlate(rotation: string, digit: number | null): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`groups/${GID}`).update({ 'policy.plateRotation': rotation });
    await db.doc(`groups/${GID}/members/alice`).update({ plateLastDigit: digit });
    await db.doc(`groups/${GID}/crews/${CID}/trips/${SATURDAY}`).set(trip('2026-10-31'));
    await db.doc(`groups/${GID}/crews/${CID}/trips/${SUNDAY}`).set(trip('2026-11-01'));
  });
}

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('plate rotation replan', () => {
  it('lets a crew member replace a driver whose odd plate is barred on an even day', async () => {
    await setPlate('odd-even', 1);
    await assertSucceeds(replan('bob'));
  });

  it('lets a crew member replace a driver whose plate is barred by the five-day rule on a weekday', async () => {
    await setPlate('five-day', 6);
    await assertSucceeds(replan('bob'));
  });

  it('denies replacing a driver whose plate may drive that day', async () => {
    await setPlate('odd-even', 2);
    await assertFails(replan('bob'));
    await setPlate('five-day', 7);
    await assertFails(replan('bob'));
  });

  it('denies replacing a five-day driver on the weekend, when no plate is barred', async () => {
    // 1 % 5 == Saturday (6) % 5 and 2 % 5 == Sunday (7) % 5: only the weekday clause lets them drive.
    await setPlate('five-day', 1);
    await assertFails(replan('bob', SATURDAY));
    await setPlate('five-day', 2);
    await assertFails(replan('bob', SUNDAY));
  });

  it('denies replacing a driver whose plate rule is off or unset', async () => {
    await setPlate('none', 1);
    await assertFails(replan('bob'));
    await setPlate('odd-even', null);
    await assertFails(replan('bob'));
  });

  it('denies a group member outside the crew or a non-member replacing a barred driver', async () => {
    await setPlate('odd-even', 1);
    await assertFails(tripDoc('carol').update({ driverId: 'bob', riderIds: ['alice'] }));
    await assertFails(tripDoc('stranger').update({ driverId: 'bob', riderIds: ['alice'] }));
  });
});
