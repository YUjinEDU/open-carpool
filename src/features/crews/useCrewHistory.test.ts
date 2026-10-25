import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trip } from '../../domain/types';
import { tripStats, useCrewHistory } from './useCrewHistory';

// Firestore is the only fake: the hook gets every snapshot the listener would deliver.
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(trips: Trip[]) => void> }));
vi.mock('../../data/trips', () => ({
  subscribeTrips: (_sub: unknown, onChange: (trips: Trip[]) => void) => {
    listeners.push(onChange);
    return () => undefined;
  },
}));

const TODAY = '2026-10-26';
const trip = (date: string, status: Trip['status']): Trip => ({
  id: `${date}_out`, date, leg: 'out', driverId: 'a', riderIds: ['b'], absentIds: [], status,
  applied: status === 'done', completedBy: null, completedAt: null, cost: null,
});

describe('useCrewHistory', () => {
  it('updates the crew stats when a trip is completed, without reloading', () => {
    const { result } = renderHook(() => {
      const history = useCrewHistory('g1', 'c1', TODAY);
      return history.status === 'ready' ? tripStats(history.data, TODAY) : null;
    });
    act(() => listeners.at(-1)?.([trip(TODAY, 'planned')]));
    expect(result.current).toEqual({ done: 0, counted: 0 });

    act(() => listeners.at(-1)?.([trip(TODAY, 'done')]));

    expect(result.current).toEqual({ done: 1, counted: 1 });
    expect(listeners).toHaveLength(1);
  });
});

describe('tripStats', () => {
  it('counts past planned trips as missed and ignores cancelled ones', () => {
    const stats = tripStats([trip('2026-10-20', 'done'), trip('2026-10-21', 'planned'), trip('2026-10-22', 'cancelled')], TODAY);

    expect(stats).toEqual({ done: 1, counted: 2 });
  });
});
