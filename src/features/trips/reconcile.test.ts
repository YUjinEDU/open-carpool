import { describe, expect, it } from 'vitest';
import type { Trip } from '../../domain/types';
import { tripsToWrite } from './reconcile';

const WINDOW = { from: '2026-10-26', to: '2026-11-01' };

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
    expect(tripsToWrite([trip()], [], WINDOW)).toEqual([trip()]);
  });

  it('skips trips whose plan is unchanged (rider order ignored)', () => {
    const planned = trip({ riderIds: ['b', 'c'] });
    expect(tripsToWrite([planned], [trip({ riderIds: ['c', 'b'] })], WINDOW)).toEqual([]);
  });

  it('rewrites an open trip whose driver changed', () => {
    const planned = trip({ driverId: 'b', riderIds: ['a'] });
    expect(tripsToWrite([planned], [trip()], WINDOW)).toEqual([planned]);
  });

  it('never rewrites done or applied trips', () => {
    const planned = trip({ driverId: 'b', riderIds: ['a'] });
    expect(tripsToWrite([planned], [trip({ status: 'done', applied: true })], WINDOW)).toEqual([]);
  });

  it('keeps a needs_driver trip open instead of re-assigning the driver who gave up', () => {
    const existing = trip({ driverId: null, status: 'needs_driver', riderIds: ['a', 'b'] });
    expect(tripsToWrite([trip()], [existing], WINDOW)).toEqual([]);
  });

  it('still updates riders of a needs_driver trip after an absence', () => {
    const existing = trip({ driverId: null, status: 'needs_driver', riderIds: ['a', 'b'] });
    const planned = trip({ driverId: 'a', riderIds: [], absentIds: ['b'] });
    expect(tripsToWrite([planned], [existing], WINDOW)).toEqual([
      trip({ driverId: null, status: 'needs_driver', riderIds: ['a'], absentIds: ['b'] }),
    ]);
  });

  it('cancels an open trip whose weekday or leg is no longer planned', () => {
    const removed = trip({ id: '2026-10-28_out', date: '2026-10-28' });
    expect(tripsToWrite([trip()], [trip(), removed], WINDOW)).toEqual([{ ...removed, status: 'cancelled' }]);
  });

  it('leaves trips outside the planning window and settled trips alone', () => {
    const yesterday = trip({ id: '2026-10-25_out', date: '2026-10-25' });
    const done = trip({ id: '2026-10-28_out', date: '2026-10-28', status: 'done', applied: true });
    expect(tripsToWrite([], [yesterday, done], WINDOW)).toEqual([]);
  });

  it('reopens a cancelled trip whose weekday is planned again', () => {
    expect(tripsToWrite([trip()], [trip({ status: 'cancelled' })], WINDOW)).toEqual([trip()]);
  });
});
