import { describe, expect, it } from 'vitest';
import type { Trip } from '../../domain/types';
import { tripsToWrite } from './reconcile';

const trip = (patch: Partial<Trip> = {}): Trip => ({
  id: '2026-10-27_out',
  date: '2026-10-27',
  leg: 'out',
  driverId: 'a',
  riderIds: ['b'],
  absentIds: [],
  status: 'planned',
  applied: false,
  completedBy: null,
  completedAt: null,
  cost: null,
  ...patch,
});

describe('tripsToWrite', () => {
  it('writes trips that do not exist yet', () => {
    expect(tripsToWrite([trip()], [])).toEqual([trip()]);
  });

  it('skips trips whose plan is unchanged (rider order ignored)', () => {
    const planned = trip({ riderIds: ['b', 'c'] });
    expect(tripsToWrite([planned], [trip({ riderIds: ['c', 'b'] })])).toEqual([]);
  });

  it('rewrites an open trip whose driver changed', () => {
    const planned = trip({ driverId: 'b', riderIds: ['a'] });
    expect(tripsToWrite([planned], [trip()])).toEqual([planned]);
  });

  it('never rewrites done or applied trips', () => {
    const planned = trip({ driverId: 'b', riderIds: ['a'] });
    expect(tripsToWrite([planned], [trip({ status: 'done', applied: true })])).toEqual([]);
  });

  it('keeps a needs_driver trip open instead of re-assigning the driver who gave up', () => {
    const existing = trip({ driverId: null, status: 'needs_driver', riderIds: ['a', 'b'] });
    expect(tripsToWrite([trip()], [existing])).toEqual([]);
  });

  it('still updates riders of a needs_driver trip after an absence', () => {
    const existing = trip({ driverId: null, status: 'needs_driver', riderIds: ['a', 'b'] });
    const planned = trip({ driverId: 'a', riderIds: [], absentIds: ['b'] });
    expect(tripsToWrite([planned], [existing])).toEqual([
      trip({ driverId: null, status: 'needs_driver', riderIds: ['a'], absentIds: ['b'] }),
    ]);
  });
});
