import { describe, expect, it, vi } from 'vitest';
import type { Crew, Member, Trip } from '../../domain/types';
import { monthCsv } from './exportCsv';
import type { CrewTrips, CsvLabels } from './stats';

const LABELS: CsvLabels = {
  leg: { out: 'out', back: 'back' },
  status: { planned: 'planned', needs_driver: 'needs driver', done: 'done', cancelled: 'cancelled' },
};
const crew = { id: 'c1', name: 'Alpha' } as Crew;
const members = [{ uid: 'a', displayName: 'A' }] as Member[];
const trip = (over: Partial<Trip>): Trip => ({
  id: '2026-10-05_out', date: '2026-10-05', leg: 'out', driverId: 'a', riderIds: [], absentIds: [],
  status: 'done', applied: true, completedBy: 'a', completedAt: null, cost: null, ...over,
});

describe('monthCsv', () => {
  it('re-queries the selected month at export time so later changes are in the file', async () => {
    // Given a data source whose trip changes after the dashboard was loaded
    let current: CrewTrips[] = [{ crew, trips: [trip({ cost: null })] }];
    const load = vi.fn(async () => current);
    current = [{ crew, trips: [trip({ cost: { totalAmount: 7, currency: 'KRW' } })] }];
    // When the export runs
    const csv = await monthCsv({ load, month: '2026-10', members, moneyEnabled: true, labels: LABELS });
    // Then the loader was asked for exactly that month and the new cost is exported
    expect(load).toHaveBeenCalledWith([{ from: '2026-10-01', to: '2026-10-31' }]);
    expect(csv).toContain(',7,KRW');
  });

  it('drops trips outside the month', async () => {
    const load = async () => [{ crew, trips: [trip({}), trip({ id: 'x', date: '2026-09-30' })] }];
    const csv = await monthCsv({ load, month: '2026-10', members, moneyEnabled: false, labels: LABELS });
    expect(csv).not.toContain('2026-09-30');
  });
});
