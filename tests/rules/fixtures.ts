import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT_ID = 'demo-open-carpool';
export const GID = 'g1';
export const CODE = 'ABCDEFGH';
export const CID = 'c1';
export const TRIP = '2026-10-26_out';
export const APPLIED_TRIP = '2026-10-23_out';
export const EID = 'e1';
export const NOW = '2026-10-24T00:00:00.000Z';

export function startEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
}

export const group = (overrides: Record<string, unknown> = {}) => ({
  name: 'Acme',
  type: 'company',
  country: 'KR',
  locale: 'ko',
  ownerId: 'owner',
  inviteCode: CODE,
  allowedEmailDomains: [],
  destination: null,
  policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
  createdAt: NOW,
  ...overrides,
});

export const member = (uid: string, role: 'owner' | 'admin' | 'member', overrides: Record<string, unknown> = {}) => ({
  uid,
  displayName: uid,
  role,
  status: 'active',
  canDrive: true,
  seats: 3,
  plateLastDigit: null,
  areaLabel: '',
  area: null,
  schedule: {},
  joinedAt: NOW,
  inviteCode: CODE,
  ...overrides,
});

export const trip = (date: string, overrides: Record<string, unknown> = {}) => ({
  date,
  leg: 'out',
  driverId: 'alice',
  riderIds: ['bob'],
  absentIds: [],
  status: 'planned',
  applied: false,
  completedBy: null,
  completedAt: null,
  cost: null,
  ...overrides,
});

/**
 * Group g1: owner (owner), admin (admin), alice / bob / carol (members).
 * Crew c1 = alice + bob, with one planned and one applied trip. Event e1 with alice's car.
 */
export async function seed(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const g = `groups/${GID}`;
    await db.doc(g).set(group());
    await db.doc(`inviteCodes/${CODE}`).set({ groupId: GID, groupName: 'Acme', createdBy: 'owner', createdAt: NOW });
    await db.doc(`${g}/members/owner`).set(member('owner', 'owner'));
    await db.doc(`${g}/members/admin`).set(member('admin', 'admin'));
    for (const uid of ['alice', 'bob', 'carol']) await db.doc(`${g}/members/${uid}`).set(member(uid, 'member'));
    await db.doc(`${g}/crews/${CID}`).set({
      name: 'Morning',
      memberIds: ['alice', 'bob'],
      captainId: 'alice',
      backupDriverIds: [],
      acceptedIds: ['alice', 'bob'],
      status: 'active',
      days: [1, 2, 3, 4, 5],
      outTime: '08:00',
      backTime: '18:00',
      pickupNote: '',
      waitLimitMin: 10,
      scores: { alice: 0, bob: 0 },
      lastDroveOn: {},
      createdBy: 'alice',
      createdAt: NOW,
    });
    await db.doc(`${g}/crews/${CID}/trips/${TRIP}`).set(trip('2026-10-26'));
    await db
      .doc(`${g}/crews/${CID}/trips/${APPLIED_TRIP}`)
      .set(trip('2026-10-23', { status: 'done', applied: true, completedBy: 'alice', completedAt: NOW }));
    await db.doc(`${g}/events/${EID}`).set({
      title: 'Workshop',
      date: '2026-11-01',
      time: '09:00',
      place: 'HQ',
      createdBy: 'alice',
      createdAt: NOW,
    });
    await db
      .doc(`${g}/events/${EID}/cars/alice`)
      .set({ driverId: 'alice', driverName: 'alice', seats: 2, riderIds: [], note: '' });
    await db.doc('users/alice').set({ uid: 'alice', displayName: 'alice', email: null, photoURL: null, locale: 'ko', createdAt: NOW });
  });
}
