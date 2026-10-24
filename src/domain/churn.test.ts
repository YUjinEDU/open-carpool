import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { detectChurn } from './churn';
import type { Trip, TripStatus } from './types';

const TODAY = '2026-10-26';
const crew = { memberIds: ['a', 'b', 'c'] };

/** n trips on consecutive days ending the day before `endExclusive`; the first `done` are done. */
const window = (endExclusive: string, n: number, done: number, absent: (i: number) => string[] = () => []): Trip[] =>
  Array.from({ length: n }, (_, i) => {
    const date = addDays(endExclusive, -(i + 1));
    const status: TripStatus = i < done ? 'done' : 'planned';
    return {
      id: `${date}_out`, date, leg: 'out', driverId: 'a', riderIds: [], absentIds: absent(i), status,
      applied: status === 'done', completedBy: null, completedAt: null, cost: null,
    };
  });
const PREV_END = addDays(TODAY, -14);

describe('detectChurn', () => {
  it('is ok when attendance holds', () => {
    const r = detectChurn([...window(TODAY, 10, 10), ...window(PREV_END, 10, 10)], crew, TODAY);
    expect(r).toEqual({ status: 'ok', recentRate: 1, previousRate: 1, membersAtRisk: [] });
  });
  it('is declining below 60% of the previous rate and ok exactly at 60%', () => {
    expect(detectChurn([...window(TODAY, 10, 5), ...window(PREV_END, 10, 10)], crew, TODAY).status).toBe('declining');
    expect(detectChurn([...window(TODAY, 10, 6), ...window(PREV_END, 10, 10)], crew, TODAY).status).toBe('ok');
  });
  it('is stalled when nothing was done recently but trips were done before', () => {
    expect(detectChurn([...window(TODAY, 10, 0), ...window(PREV_END, 10, 3)], crew, TODAY).status).toBe('stalled');
    expect(detectChurn(window(PREV_END, 10, 3), crew, TODAY).status).toBe('stalled');
  });
  it('is ok for a brand-new crew with no history', () => {
    expect(detectChurn(window(TODAY, 3, 0), crew, TODAY).status).toBe('ok');
  });
  it('ignores cancelled trips and trips from today onward', () => {
    const cancelled = window(TODAY, 10, 0).map((t) => ({ ...t, status: 'cancelled' as const }));
    const future = window(addDays(TODAY, 5), 5, 0);
    const r = detectChurn([...cancelled, ...future, ...window(PREV_END, 10, 10)], crew, TODAY);
    expect(r.recentRate).toBe(0);
    expect(r.status).toBe('stalled');
  });
  it('flags members absent from at least 60% of recent trips', () => {
    const recent = window(TODAY, 10, 10, (i) => [...(i < 6 ? ['c'] : []), ...(i < 5 ? ['b'] : [])]);
    expect(detectChurn(recent, crew, TODAY).membersAtRisk).toEqual(['c']);
  });
});
