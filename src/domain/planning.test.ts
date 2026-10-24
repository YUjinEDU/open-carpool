import { describe, expect, it } from 'vitest';
import { isPastCutoff, planTrips, type PlanInput } from './planning';
import type { Crew, GroupPolicy, Member, Trip } from './types';

const member = (uid: string, over: Partial<Member> = {}): Member => ({
  uid,
  displayName: uid,
  role: 'member',
  status: 'active',
  canDrive: true,
  seats: 3,
  plateLastDigit: null,
  areaLabel: '',
  area: null,
  schedule: {},
  joinedAt: '2026-01-01T00:00:00Z',
  inviteCode: 'X',
  ...over,
});

const crew = (over: Partial<Crew> = {}): Crew => ({
  id: 'c1',
  name: 'crew',
  memberIds: ['a', 'b', 'c'],
  captainId: 'a',
  backupDriverIds: [],
  acceptedIds: ['a', 'b', 'c'],
  status: 'active',
  days: [1, 2, 3, 4, 5],
  outTime: '08:00',
  backTime: null,
  pickupNote: '',
  waitLimitMin: 5,
  scores: {},
  lastDroveOn: {},
  createdBy: 'a',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

const trip = (date: string, over: Partial<Trip> = {}): Trip => ({
  id: `${date}_out`,
  date,
  leg: 'out',
  driverId: null,
  riderIds: [],
  absentIds: [],
  status: 'planned',
  applied: false,
  completedBy: null,
  completedAt: null,
  cost: null,
  ...over,
});

const policy: GroupPolicy = { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' };
const members = [member('a'), member('b'), member('c', { canDrive: false })];
const MON = '2026-10-26';
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  crew: crew(),
  members,
  from: MON,
  days: 7,
  existing: [],
  now: new Date('2026-10-20T00:00:00Z'),
  tz: 'Asia/Seoul',
  policy,
  ...over,
});

describe('isPastCutoff', () => {
  // Trip on Tue 2026-10-27; cutoff 21:00 KST Mon = 12:00Z Mon.
  it('is open one second before the cutoff hour and frozen exactly at it', () => {
    expect(isPastCutoff('2026-10-27', 21, new Date('2026-10-26T11:59:59Z'), 'Asia/Seoul')).toBe(false);
    expect(isPastCutoff('2026-10-27', 21, new Date('2026-10-26T12:00:00Z'), 'Asia/Seoul')).toBe(true);
  });
  it('uses the local date when UTC is still on the previous day', () => {
    const now = new Date('2026-10-26T15:30:00Z'); // 00:30 KST on the trip day
    expect(isPastCutoff('2026-10-27', 21, now, 'Asia/Seoul')).toBe(true);
    expect(isPastCutoff('2026-10-27', 21, now, 'UTC')).toBe(false);
  });
  it('is frozen on and after the trip date', () => {
    expect(isPastCutoff('2026-10-27', 23, new Date('2026-10-27T01:00:00Z'), 'Asia/Seoul')).toBe(true);
  });
});

describe('planTrips', () => {
  it('creates one trip per crew weekday and leg with idempotent ids', () => {
    const trips = planTrips(input({ crew: crew({ backTime: '18:00' }) }));
    expect(trips.map((t) => t.id)).toEqual([
      '2026-10-26_out', '2026-10-26_back', '2026-10-27_out', '2026-10-27_back', '2026-10-28_out',
      '2026-10-28_back', '2026-10-29_out', '2026-10-29_back', '2026-10-30_out', '2026-10-30_back',
    ]);
  });
  it('rotates drivers across the window by projecting the ledger forward', () => {
    const trips = planTrips(input());
    expect(trips.map((t) => t.driverId)).toEqual(['a', 'b', 'a', 'b', 'a']);
    expect(trips[0].riderIds).toEqual(['b', 'c']);
    expect(trips.every((t) => t.status === 'planned')).toBe(true);
  });
  it('marks needs_driver when absences leave nobody eligible', () => {
    const existing = [trip(MON, { absentIds: ['a', 'b'] })];
    const [mon] = planTrips(input({ existing }));
    expect(mon).toMatchObject({ driverId: null, status: 'needs_driver', riderIds: ['c'], absentIds: ['a', 'b'] });
  });
  it('returns done and cancelled trips untouched', () => {
    const done = trip(MON, { status: 'done', driverId: 'c', riderIds: ['a'], applied: true });
    const cancelled = trip('2026-10-27', { status: 'cancelled' });
    const trips = planTrips(input({ existing: [done, cancelled] }));
    expect(trips[0]).toBe(done);
    expect(trips[1]).toBe(cancelled);
  });
  it('keeps an existing driver while still present and eligible', () => {
    const existing = [trip(MON, { driverId: 'b', riderIds: ['a', 'c'] })];
    expect(planTrips(input({ existing }))[0].driverId).toBe('b');
  });
  it('replaces an existing driver who marked absent before the cutoff', () => {
    const existing = [trip(MON, { driverId: 'b', absentIds: ['b'] })];
    expect(planTrips(input({ existing }))[0]).toMatchObject({ driverId: 'a', riderIds: ['c'] });
  });
  it('freezes open trips after the cutoff', () => {
    const frozen = trip(MON, { driverId: 'b', riderIds: ['a', 'c'], absentIds: [] });
    const now = new Date('2026-10-25T12:00:00Z'); // Sun 21:00 KST
    const trips = planTrips(input({ existing: [frozen], now, members: [member('a'), member('b', { status: 'left' }), members[2]] }));
    expect(trips[0]).toBe(frozen);
  });
  it('applies the plate policy to driver eligibility', () => {
    const plated = [member('a', { plateLastDigit: 1 }), member('b', { plateLastDigit: 2 }), members[2]];
    const trips = planTrips(input({ members: plated, policy: { ...policy, plateRotation: 'five-day' } }));
    expect(trips[0].driverId).toBe('b'); // Monday restricts 1/6
    expect(trips[1].driverId).toBe('a'); // Tuesday restricts 2/7
  });
  it('excludes members who left the group', () => {
    const trips = planTrips(input({ members: [member('a'), member('b', { status: 'left' }), members[2]] }));
    expect(trips.every((t) => t.driverId === 'a' && t.riderIds.join() === 'c')).toBe(true);
  });
  it('plans nothing for a paused crew or a crew without times', () => {
    expect(planTrips(input({ crew: crew({ status: 'paused' }) }))).toEqual([]);
    expect(planTrips(input({ crew: crew({ outTime: null }) }))).toEqual([]);
  });
});
