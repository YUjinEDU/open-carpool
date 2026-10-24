import { describe, expect, it } from 'vitest';
import { applyTrip, pickDriver, shareUnits, scoreInRides, UNIT } from './rotation';

describe('shareUnits', () => {
  it('gives integer units for every crew size 1..6', () => {
    for (let k = 1; k <= 6; k++) expect(Number.isInteger(shareUnits(k))).toBe(true);
  });
  it('rejects sizes outside 1..6', () => {
    expect(() => shareUnits(0)).toThrow(RangeError);
    expect(() => shareUnits(7)).toThrow(RangeError);
    expect(() => shareUnits(2.5)).toThrow(RangeError);
  });
});

describe('applyTrip', () => {
  it('credits the driver and debits riders so the ledger sums to zero', () => {
    const s = applyTrip({}, 'a', ['b', 'c']);
    expect(s).toEqual({ a: 40, b: -20, c: -20 });
    expect(Object.values(s).reduce((x, y) => x + y, 0)).toBe(0);
  });
  it('leaves absent members untouched', () => {
    const s = applyTrip({ a: 0, b: 0, c: 0, d: 7 }, 'a', ['b']);
    expect(s.c).toBe(0);
    expect(s.d).toBe(7);
  });
  it('ignores the driver listed as rider and duplicate riders', () => {
    expect(applyTrip({}, 'a', ['a', 'b', 'b'])).toEqual({ a: 30, b: -30 });
  });
  it('a solo trip changes nothing', () => {
    expect(applyTrip({ a: 5 }, 'a', [])).toEqual({ a: 5 });
  });
});

describe('pickDriver', () => {
  it('picks the lowest score among present eligible members', () => {
    expect(pickDriver({ present: ['a', 'b', 'c'], eligible: ['a', 'b', 'c'], scores: { a: 20, b: -40, c: 20 } })).toBe('b');
  });
  it('skips members who cannot drive and returns null when nobody can', () => {
    expect(pickDriver({ present: ['a', 'b'], eligible: ['a'], scores: { a: 50, b: -50 } })).toBe('a');
    expect(pickDriver({ present: ['a', 'b'], eligible: [], scores: {} })).toBeNull();
  });
  it('breaks ties by whoever drove longest ago, never-drove first', () => {
    expect(pickDriver({ present: ['a', 'b', 'c'], eligible: ['a', 'b', 'c'], scores: {}, lastDroveOn: { a: '2026-10-20', b: '2026-10-01' } })).toBe('c');
    expect(pickDriver({ present: ['a', 'b'], eligible: ['a', 'b'], scores: {}, lastDroveOn: { a: '2026-10-20', b: '2026-10-01' } })).toBe('b');
  });
});

describe('fairness over time', () => {
  it('keeps every member within ~1 ride of fair share despite random absences and overrides', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const members = ['a', 'b', 'c', 'd', 'e'];
    let scores = {} as Record<string, number>;
    let worst = 0;
    for (let day = 0; day < 1000; day++) {
      const present = members.filter(() => rand() < 0.75);
      if (present.length < 2) continue;
      let driver = pickDriver({ present, eligible: present, scores })!;
      if (rand() < 0.05) driver = present[Math.floor(rand() * present.length)]; // manual override / swap
      scores = applyTrip(scores, driver, present.filter((p) => p !== driver));
      worst = Math.max(worst, ...Object.values(scores).map((v) => Math.abs(scoreInRides(v))));
    }
    expect(worst).toBeLessThan(2.5); // bound (n-1)/2 = 2 for greedy; overrides add slack
    expect(Object.values(scores).reduce((x, y) => x + y, 0)).toBe(0);
    expect(UNIT).toBe(60);
  });
});
