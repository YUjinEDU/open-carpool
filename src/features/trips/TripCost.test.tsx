import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../shared/i18n';
import type { Group, Trip } from '../../domain/types';
import { TripCost } from './TripCost';

const doneTrip = (patch: Partial<Trip> = {}): Trip => ({
  id: '2026-10-27_out',
  date: '2026-10-27',
  leg: 'out',
  driverId: 'a',
  riderIds: ['b'],
  absentIds: [],
  status: 'done',
  applied: true,
  completedBy: 'a',
  completedAt: '2026-10-27T09:00:00Z',
  cost: null,
  ...patch,
});
const actualCost: Group['policy'] = { costMode: 'actual-cost', absenceCutoffHour: 21, plateRotation: 'none' };
const names = new Map([['a', 'Ann'], ['b', 'Bo']]);
const noop = () => undefined;

describe('TripCost', () => {
  it('renders no money UI in a KR group even when actual-cost was stored', () => {
    const { container } = render(<TripCost group={{ country: 'KR', policy: actualCost }} trip={doneTrip()} names={names} onSave={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a cost entry on done trips of a non-KR actual-cost group', () => {
    render(<TripCost group={{ country: 'US', policy: actualCost }} trip={doneTrip()} names={names} onSave={noop} />);
    expect(screen.getByTestId('trip-cost-amount')).toBeInTheDocument();
  });

  it('shows what each rider owes once a cost is recorded', () => {
    const trip = doneTrip({ cost: { totalAmount: 10, currency: 'USD' } });
    render(<TripCost group={{ country: 'US', policy: actualCost }} trip={trip} names={names} onSave={noop} />);
    expect(screen.getByTestId('trip-cost-split')).toHaveTextContent('$5.00');
  });
});
