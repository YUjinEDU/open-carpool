import { assertNever } from './assert';
import { scorePair } from './suggest';
import type { Member, PlateRotation } from './types';

export interface PairOptions {
  readonly maxDistanceKm?: number;
}

export interface PlatePair {
  /** Sorted uids of the two members. */
  readonly memberIds: readonly [string, string];
  readonly km: number;
  /** Weekday legs (out/back) both travel within 30 minutes of each other. */
  readonly overlap: number;
  readonly score: number;
}

/**
 * Whether two plate last digits never share a restricted day, so the pair always has a car:
 * odd-even needs one odd and one even digit; five-day (Mon 1/6 ... Fri 5/0) needs different weekdays.
 */
export function platesComplement(rotation: PlateRotation, a: number, b: number): boolean {
  switch (rotation) {
    case 'none':
      return false;
    case 'odd-even':
      return a % 2 !== b % 2;
    case 'five-day':
      return a % 5 !== b % 5;
    default:
      return assertNever(rotation);
  }
}

/**
 * Driver pairs whose plates complement each other under the group's rotation, ranked with the
 * crew-suggestion score (schedule overlap + closeness). Members without a plate digit, an area or
 * a driving flag are left out; a rotation of 'none' yields no pairs.
 */
export function plateComplementPairs(members: readonly Member[], rotation: PlateRotation, { maxDistanceKm = 5 }: PairOptions = {}): PlatePair[] {
  const pool = members.filter((m) => m.status === 'active' && m.canDrive && m.plateLastDigit !== null);
  const pairs: PlatePair[] = [];
  for (const [i, x] of pool.entries()) {
    for (const y of pool.slice(i + 1)) {
      if (x.plateLastDigit === null || y.plateLastDigit === null) continue;
      if (!platesComplement(rotation, x.plateLastDigit, y.plateLastDigit)) continue;
      const pair = scorePair(x, y, maxDistanceKm);
      if (pair === null) continue;
      const memberIds: [string, string] = x.uid < y.uid ? [x.uid, y.uid] : [y.uid, x.uid];
      pairs.push({ memberIds, ...pair });
    }
  }
  return pairs.sort((p, q) => q.score - p.score || p.memberIds.join('|').localeCompare(q.memberIds.join('|')));
}
