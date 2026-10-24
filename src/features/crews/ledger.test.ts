import { describe, expect, it } from 'vitest';
import { applyTrip } from '../../domain/rotation';
import { formatRides } from './ledger';

describe('formatRides', () => {
  it('shows a two-person trip as +0.5 for the driver and -0.5 for the rider', () => {
    const scores = applyTrip({ a: 0, b: 0 }, 'a', ['b']);
    expect(formatRides(scores.a)).toBe('+0.5');
    expect(formatRides(scores.b)).toBe('-0.5');
  });

  it('shows an even balance as 0', () => {
    expect(formatRides(0)).toBe('0');
  });

  it('rounds thirds to two decimals', () => {
    const scores = applyTrip({}, 'a', ['b', 'c']);
    expect(formatRides(scores.a)).toBe('+0.67');
    expect(formatRides(scores.b)).toBe('-0.33');
  });
});
