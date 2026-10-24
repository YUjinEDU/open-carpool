import { describe, expect, it } from 'vitest';
import { plateComplementPairs, platesComplement } from './pairs';
import type { LatLng, Member, WeeklySchedule } from './types';

const BASE: LatLng = { lat: 36.35, lng: 127.38 };
const MON_8: WeeklySchedule = { 1: { out: '08:00', back: '18:00' } };

const driver = (uid: string, plateLastDigit: number | null, over: Partial<Member> = {}): Member => ({
  uid,
  displayName: uid,
  role: 'member',
  status: 'active',
  canDrive: true,
  seats: 3,
  plateLastDigit,
  areaLabel: '',
  area: BASE,
  schedule: MON_8,
  joinedAt: '2026-01-01T00:00:00Z',
  inviteCode: 'X',
  ...over,
});
const near = (dLat: number): LatLng => ({ lat: BASE.lat + dLat, lng: BASE.lng });
const ids = (pairs: ReturnType<typeof plateComplementPairs>): string[] => pairs.map((p) => p.memberIds.join('+'));

describe('platesComplement', () => {
  it('pairs one odd and one even digit under odd-even (0 is even)', () => {
    expect(platesComplement('odd-even', 3, 8)).toBe(true);
    expect(platesComplement('odd-even', 0, 7)).toBe(true);
    expect(platesComplement('odd-even', 3, 5)).toBe(false);
    expect(platesComplement('odd-even', 0, 4)).toBe(false);
  });
  it('pairs digits restricted on different weekdays under five-day', () => {
    expect(platesComplement('five-day', 1, 2)).toBe(true);
    expect(platesComplement('five-day', 1, 6)).toBe(false); // both Monday
    expect(platesComplement('five-day', 5, 0)).toBe(false); // both Friday
  });
  it('never pairs when there is no rotation', () => {
    expect(platesComplement('none', 1, 2)).toBe(false);
  });
});

describe('plateComplementPairs', () => {
  it('returns only complementary pairs under odd-even', () => {
    const members = [driver('a', 1), driver('b', 3), driver('c', 4)];
    expect(ids(plateComplementPairs(members, 'odd-even'))).toEqual(['a+c', 'b+c']);
  });
  it('uses restricted weekdays under five-day', () => {
    const members = [driver('a', 1), driver('b', 6), driver('c', 2)];
    expect(ids(plateComplementPairs(members, 'five-day'))).toEqual(['a+c', 'b+c']);
  });
  it('excludes members without a plate digit, non-drivers and inactive members', () => {
    const members = [driver('a', 1), driver('b', null), driver('c', 2, { canDrive: false }), driver('d', 4, { status: 'left' })];
    expect(plateComplementPairs(members, 'odd-even')).toEqual([]);
  });
  it('ranks closer pairs first and drops pairs beyond the distance limit', () => {
    const members = [driver('a', 1), driver('b', 2, { area: near(0.03) }), driver('c', 4, { area: near(0.001) }), driver('d', 6, { area: near(1) })];
    const pairs = plateComplementPairs(members, 'odd-even');
    expect(ids(pairs)).toEqual(['a+c', 'a+b']);
    expect(pairs[0]?.overlap).toBe(2);
  });
  it('drops pairs that never travel at the same time', () => {
    const members = [driver('a', 1), driver('b', 2, { schedule: { 2: { out: '10:00' } } })];
    expect(plateComplementPairs(members, 'odd-even')).toEqual([]);
  });
  it('yields nothing when the group has no plate rotation', () => {
    expect(plateComplementPairs([driver('a', 1), driver('b', 2)], 'none')).toEqual([]);
  });
});
