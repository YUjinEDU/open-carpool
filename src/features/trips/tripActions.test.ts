import { describe, expect, it } from 'vitest';
import type { GroupPolicy, Trip } from '../../domain/types';
import { tripActions, type TripActionContext } from './tripActions';

const TZ = 'Asia/Seoul';
const policy: GroupPolicy = { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' };
const crew = { memberIds: ['a', 'b', 'c'], captainId: 'c', outTime: '08:00', backTime: '18:30' };
/** KST wall-clock instant. */
const kst = (date: string, time: string): Date => new Date(`${date}T${time}:00+09:00`);

const trip = (patch: Partial<Trip> = {}): Trip => ({
  id: '2026-10-27_out',
  date: '2026-10-27',
  leg: 'out',
  driverId: 'a',
  riderIds: ['b', 'c'],
  absentIds: [],
  status: 'planned',
  applied: false,
  completedBy: null,
  completedAt: null,
  cost: null,
  ...patch,
});

const ctx = (uid: string, now: Date, patch: Partial<TripActionContext> = {}): TripActionContext => ({
  me: { uid, canDrive: true, plateLastDigit: null },
  crew,
  now,
  policy,
  tz: TZ,
  ...patch,
});

describe('tripActions absence toggle', () => {
  it('is offered until the hour before the cutoff on the previous day', () => {
    expect(tripActions(trip(), ctx('b', kst('2026-10-26', '20:59'))).absence).toBe('mark-absent');
  });

  it('disappears at the cutoff hour', () => {
    expect(tripActions(trip(), ctx('b', kst('2026-10-26', '21:00'))).absence).toBeNull();
  });

  it('offers "I am back" when already absent', () => {
    expect(tripActions(trip({ absentIds: ['b'] }), ctx('b', kst('2026-10-25', '09:00'))).absence).toBe('mark-back');
  });

  it('is hidden for non-members', () => {
    expect(tripActions(trip(), ctx('z', kst('2026-10-25', '09:00'))).absence).toBeNull();
  });
});

describe('tripActions driving', () => {
  it('lets only the assigned driver give up driving', () => {
    const now = kst('2026-10-27', '07:00');
    expect(tripActions(trip(), ctx('a', now)).cantDrive).toBe(true);
    expect(tripActions(trip(), ctx('b', now)).cantDrive).toBe(false);
  });

  it('offers volunteering on needs_driver trips to present drivers', () => {
    const open = trip({ status: 'needs_driver', driverId: null, riderIds: ['a', 'b', 'c'] });
    expect(tripActions(open, ctx('b', kst('2026-10-27', '07:00'))).volunteer).toBe(true);
  });

  it('hides volunteering when the plate rule bans my car that day', () => {
    const open = trip({ status: 'needs_driver', driverId: null });
    const banned = ctx('b', kst('2026-10-27', '07:00'), {
      me: { uid: 'b', canDrive: true, plateLastDigit: 2 }, // 2026-10-27 is a Tuesday: 2/7 restricted
      policy: { ...policy, plateRotation: 'five-day' },
    });
    expect(tripActions(open, banned).volunteer).toBe(false);
  });

  it('hides volunteering for members who cannot drive', () => {
    const open = trip({ status: 'needs_driver', driverId: null });
    expect(tripActions(open, ctx('b', kst('2026-10-27', '07:00'), { me: { uid: 'b', canDrive: false, plateLastDigit: null } })).volunteer).toBe(false);
  });
});

describe('tripActions completion', () => {
  it('is hidden before the trip date', () => {
    expect(tripActions(trip(), ctx('a', kst('2026-10-26', '23:59'))).done).toBe(false);
  });

  it('is hidden on the trip date before the leg departs (a sick driver must still see "can\'t drive")', () => {
    const morning = tripActions(trip(), ctx('a', kst('2026-10-27', '07:59')));
    expect(morning.done).toBe(false);
    expect(morning.cantDrive).toBe(true);
    expect(tripActions(trip(), ctx('a', kst('2026-10-27', '00:00'))).done).toBe(false);
  });

  it('is offered to the driver from the departure time on, and on every later day', () => {
    expect(tripActions(trip(), ctx('a', kst('2026-10-27', '08:00'))).done).toBe(true);
    expect(tripActions(trip({ id: '2026-10-27_back', leg: 'back' }), ctx('a', kst('2026-10-27', '18:29'))).done).toBe(false);
    expect(tripActions(trip({ id: '2026-10-27_back', leg: 'back' }), ctx('a', kst('2026-10-27', '18:30'))).done).toBe(true);
    expect(tripActions(trip(), ctx('a', kst('2026-10-29', '10:00'))).done).toBe(true);
  });

  it('treats a leg without a time as departed all day', () => {
    const noTime = ctx('a', kst('2026-10-27', '00:10'), { crew: { ...crew, outTime: null } });
    expect(tripActions(trip(), noTime).done).toBe(true);
  });

  it('is offered to the captain but not to other riders', () => {
    const now = kst('2026-10-27', '09:00');
    expect(tripActions(trip(), ctx('c', now)).done).toBe(true);
    expect(tripActions(trip(), ctx('b', now)).done).toBe(false);
  });

  it('turns into "already completed" once applied, with every action gone', () => {
    const actions = tripActions(trip({ status: 'done', applied: true }), ctx('a', kst('2026-10-25', '09:00')));
    expect(actions).toEqual({ absence: null, cantDrive: false, volunteer: false, done: false, completed: true });
  });
});
