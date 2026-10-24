import { describe, expect, it } from 'vitest';
import { haversineKm, scheduleOverlap, suggestCrews } from './suggest';
import type { LatLng, Member, WeeklySchedule } from './types';

const BASE: LatLng = { lat: 36.35, lng: 127.38 };
const MON_8: WeeklySchedule = { 1: { out: '08:00', back: '18:00' } };

const member = (uid: string, over: Partial<Member> = {}): Member => ({
  uid,
  displayName: uid,
  role: 'member',
  status: 'active',
  canDrive: false,
  seats: 3,
  plateLastDigit: null,
  areaLabel: '',
  area: BASE,
  schedule: MON_8,
  joinedAt: '2026-01-01T00:00:00Z',
  inviteCode: 'X',
  ...over,
});
const near = (dLat: number): LatLng => ({ lat: BASE.lat + dLat, lng: BASE.lng });

describe('haversineKm', () => {
  it('measures Seoul to Busan at about 325 km', () => {
    const km = haversineKm({ lat: 37.5665, lng: 126.978 }, { lat: 35.1796, lng: 129.0756 });
    expect(km).toBeGreaterThan(320);
    expect(km).toBeLessThan(330);
  });
  it('is zero for the same point', () => {
    expect(haversineKm(BASE, BASE)).toBe(0);
  });
});

describe('scheduleOverlap', () => {
  it('counts legs within 30 minutes on shared weekdays', () => {
    expect(scheduleOverlap(MON_8, { 1: { out: '08:30', back: '19:00' } })).toBe(1);
    expect(scheduleOverlap(MON_8, { 1: { out: '08:31' } })).toBe(0);
    expect(scheduleOverlap(MON_8, { 2: { out: '08:00' } })).toBe(0);
    expect(scheduleOverlap(MON_8, MON_8)).toBe(2);
  });
});

describe('suggestCrews', () => {
  it('never suggests a crew without a driver', () => {
    const far = member('c', { canDrive: true, area: near(1) });
    expect(suggestCrews([member('a'), member('b'), far])).toEqual([]);
  });
  it('fills the last seat with a driver when the crew has none yet', () => {
    const ms = [member('a'), member('b'), member('c'), member('d', { canDrive: true, area: near(0.03) })];
    const [best] = suggestCrews(ms, { maxSize: 3 });
    expect(best.memberIds).toContain('d');
    expect(best.memberIds).toHaveLength(3);
  });
  it('skips members without an area, who left, or whose schedules do not overlap', () => {
    const ms = [
      member('a', { canDrive: true }),
      member('b', { area: null }),
      member('c', { status: 'left' }),
      member('d', { schedule: { 1: { out: '10:00' } } }),
    ];
    expect(suggestCrews(ms)).toEqual([]);
  });
  it('respects maxSize and ranks the tighter crew first', () => {
    const ms = [
      member('a', { canDrive: true }), member('b'), member('c'), member('d'),
      member('e', { canDrive: true, area: near(0.03) }), member('f', { area: near(0.03) }),
    ];
    const result = suggestCrews(ms, { maxSize: 4 });
    expect(result.every((s) => s.memberIds.length >= 2 && s.memberIds.length <= 4)).toBe(true);
    expect(result[0].memberIds).toEqual(['a', 'b', 'c', 'd']);
    expect(result[1].memberIds).toEqual(['e', 'f']);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });
  it('explains suggestions with i18n keys and params', () => {
    const [s] = suggestCrews([member('a', { canDrive: true }), member('b', { area: near(0.01) })]);
    expect(s.reasons.map((r) => r.key)).toEqual(['suggest.reason.nearby', 'suggest.reason.schedule', 'suggest.reason.drivers']);
    expect(s.reasons[0].params.km).toBeCloseTo(1.1, 1);
    expect(s.reasons[2].params.count).toBe(1);
  });
});
