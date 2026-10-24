import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { APPLIED_TRIP, CID, GID, NOW, TRIP, seed, startEnv, trip } from './fixtures';

/**
 * S-02 (e) / AR-1: the crew ledger moves only together with the trip it settles (Option A),
 * S-03: trips cannot be born settled, S-15: trip cost shape.
 * Crew c1 = alice + bob; TRIP is planned with driver alice and rider bob.
 */
let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const crewPath = (cid = CID) => `groups/${GID}/crews/${cid}`;
const tripPath = (id = TRIP, cid = CID) => `${crewPath(cid)}/trips/${id}`;
const DONE = { status: 'done', applied: true, completedBy: 'alice', completedAt: NOW };

function settle(uid: string, crewPatch: Record<string, unknown>, tripPatch: Record<string, unknown> = DONE) {
  const db = as(uid);
  const batch = db.batch();
  batch.update(db.doc(tripPath()), tripPatch);
  batch.update(db.doc(crewPath()), crewPatch);
  return batch.commit();
}

beforeAll(async () => { env = await startEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(env); });

describe('ledger binding', () => {
  it('denies a direct score edit with no trip', async () => {
    await assertFails(as('bob').doc(crewPath()).update({ scores: { alice: -600, bob: 600 } }));
  });

  it('denies a score edit that names an already applied trip', async () => {
    await assertFails(
      as('bob').doc(crewPath()).update({ scores: { alice: 30, bob: -30 }, lastDroveOn: { alice: '2026-10-23' }, ledgerTripId: APPLIED_TRIP }),
    );
  });

  it('denies settling a trip without moving the ledger', async () => {
    await assertFails(as('alice').doc(tripPath()).update(DONE));
    await assertFails(settle('alice', { ledgerTripId: TRIP }));
  });

  it('denies a ledger move whose deltas do not match the trip', async () => {
    await assertFails(settle('alice', { scores: { alice: 60, bob: -60 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP }));
    await assertFails(settle('alice', { scores: { alice: 30, bob: -30 }, lastDroveOn: { bob: '2026-10-26' }, ledgerTripId: TRIP }));
  });

  it('denies a ledger move that touches someone outside the trip', async () => {
    await assertFails(
      settle('alice', { scores: { alice: 30, bob: -30, carol: 5 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP }),
    );
  });

  it('denies settling a trip on behalf of someone else', async () => {
    await assertFails(
      settle('bob', { scores: { alice: 30, bob: -30 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP }),
    );
  });

  it('keeps the later lastDroveOn when an older trip is settled late', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(crewPath()).update({ lastDroveOn: { alice: '2026-10-27' } }));
    await assertFails(settle('alice', { scores: { alice: 30, bob: -30 }, lastDroveOn: { alice: '2026-10-26' }, ledgerTripId: TRIP }));
    await assertSucceeds(settle('alice', { scores: { alice: 30, bob: -30 }, ledgerTripId: TRIP }));
  });

  it('settles a four-person trip with exact Fagin-Williams shares', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc(crewPath()).update({ memberIds: ['alice', 'bob', 'carol', 'dave'], scores: { alice: -15, bob: 0, carol: 0 } });
      await db.doc(tripPath()).update({ riderIds: ['bob', 'carol', 'dave'] });
    });
    await assertSucceeds(
      settle('bob', {
        scores: { alice: 30, bob: -15, carol: -15, dave: -15 },
        lastDroveOn: { alice: '2026-10-26' },
        ledgerTripId: TRIP,
      }, { ...DONE, completedBy: 'bob' }),
    );
  });
});

describe('trip creation', () => {
  const create = (uid: string, id: string, data: Record<string, unknown>) => as(uid).doc(tripPath(id)).set(data);

  it('lets a crew member create a planned or needs_driver trip', async () => {
    await assertSucceeds(create('bob', '2026-10-27_out', trip('2026-10-27')));
    await assertSucceeds(create('bob', '2026-10-27_back', trip('2026-10-27', { leg: 'back', driverId: null, status: 'needs_driver' })));
  });

  it('denies a trip born applied or done', async () => {
    await assertFails(create('bob', '2026-10-30_out', trip('2026-10-30', { ...DONE, completedBy: 'bob' })));
    await assertFails(create('bob', '2026-10-30_out', trip('2026-10-30', { status: 'done' })));
    await assertFails(create('bob', '2026-10-30_out', trip('2026-10-30', { completedBy: 'bob' })));
  });

  it('caps a driven trip at five riders; an open trip may hold the whole crew', async () => {
    const six = ['b', 'c', 'd', 'e', 'f', 'g'];
    await assertFails(create('bob', '2026-10-30_out', trip('2026-10-30', { riderIds: six })));
    await assertSucceeds(create('bob', '2026-10-30_out', trip('2026-10-30', { riderIds: six.slice(0, 5) })));
    await assertSucceeds(create('bob', '2026-10-30_back', trip('2026-10-30', { leg: 'back', driverId: null, status: 'needs_driver', riderIds: six })));
  });

  it('denies a trip whose id does not match its date and leg', async () => {
    await assertFails(create('bob', 'anything', trip('2026-10-30')));
    await assertFails(create('bob', '2026-10-30_back', trip('2026-10-30')));
    await assertFails(create('bob', '1999-1-1_out', trip('1999-1-1')));
    await assertFails(create('bob', '2026-10-30_side', trip('2026-10-30', { leg: 'side' })));
  });
});

describe('trip cost', () => {
  it('denies a negative, huge or malformed cost', async () => {
    const cost = (c: unknown) => as('alice').doc(tripPath(APPLIED_TRIP)).update({ cost: c });
    await assertFails(cost({ totalAmount: -1, currency: 'USD' }));
    await assertFails(cost({ totalAmount: 10_000_000, currency: 'USD' }));
    await assertFails(cost({ totalAmount: 12, currency: 'XX' }));
    await assertFails(cost({ totalAmount: '12', currency: 'USD' }));
    await assertSucceeds(cost({ totalAmount: 12_000, currency: 'KRW' }));
  });
});
