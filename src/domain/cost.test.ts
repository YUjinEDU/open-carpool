import { describe, expect, it } from 'vitest';
import { MoneyFeaturesDisabledError, splitActualCost } from './cost';

const sumMinor = (values: Record<string, number>, scale: number): number =>
  Object.values(values).reduce((s, v) => s + Math.round(v * scale), 0);

describe('splitActualCost', () => {
  it('splits KRW in whole won and gives the remainder to the driver first', () => {
    const r = splitActualCost({ cost: { totalAmount: 10000, currency: 'KRW' }, driverId: 'd', riderIds: ['b', 'a'], allowed: true });
    expect(r.shares).toEqual({ d: 3334, a: 3333, b: 3333 });
    expect(r.riderOwes).toEqual({ a: 3333, b: 3333 });
  });
  it('splits USD in cents and sums exactly to the total', () => {
    const r = splitActualCost({ cost: { totalAmount: 10.01, currency: 'USD' }, driverId: 'd', riderIds: ['a', 'b'], allowed: true });
    expect(r.shares).toEqual({ d: 3.34, a: 3.34, b: 3.33 });
    expect(sumMinor(r.shares, 100)).toBe(1001);
  });
  it('sums exactly to the total for awkward amounts', () => {
    for (const total of [0.01, 1, 99.99, 123.45, 1000]) {
      for (let riders = 0; riders <= 5; riders++) {
        const riderIds = Array.from({ length: riders }, (_, i) => `r${i}`);
        const r = splitActualCost({ cost: { totalAmount: total, currency: 'USD' }, driverId: 'd', riderIds, allowed: true });
        expect(sumMinor(r.shares, 100)).toBe(Math.round(total * 100));
      }
    }
  });
  it('ignores duplicate riders and the driver listed as rider', () => {
    const r = splitActualCost({ cost: { totalAmount: 9000, currency: 'KRW' }, driverId: 'd', riderIds: ['a', 'a', 'd'], allowed: true });
    expect(r.shares).toEqual({ d: 4500, a: 4500 });
  });
  it('throws when money features are not allowed', () => {
    expect(() => splitActualCost({ cost: { totalAmount: 1000, currency: 'KRW' }, driverId: 'd', riderIds: ['a'], allowed: false }))
      .toThrow(MoneyFeaturesDisabledError);
  });
  it('rejects negative or non-finite totals', () => {
    expect(() => splitActualCost({ cost: { totalAmount: -1, currency: 'USD' }, driverId: 'd', riderIds: [], allowed: true })).toThrow(RangeError);
    expect(() => splitActualCost({ cost: { totalAmount: Number.NaN, currency: 'USD' }, driverId: 'd', riderIds: [], allowed: true })).toThrow(RangeError);
  });
});
