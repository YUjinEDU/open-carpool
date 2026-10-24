import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../shared/i18n';
import { GroupContext } from '../../app/providers/group';
import type { Crew, Group, Member, Trip } from '../../domain/types';
import { TripActionBar } from './TripActionBar';

// The bar only renders here; no write reaches Firestore.
vi.mock('../../firebase', () => ({ db: {}, auth: {} }));

const group: Group = {
  id: 'g1', name: 'Acme', type: 'company', country: 'KR', locale: 'ko', ownerId: 'a', inviteCode: 'ABCDEFGH',
  allowedEmailDomains: [], destination: null, policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
  createdAt: '2026-01-01T00:00:00Z',
};
const me: Member = {
  uid: 'b', displayName: 'Bo', role: 'member', status: 'active', canDrive: false, seats: 0, plateLastDigit: null,
  areaLabel: '', area: null, schedule: {}, joinedAt: '2026-01-01T00:00:00Z', inviteCode: 'ABCDEFGH',
};
const crew: Crew = {
  id: 'c1', name: 'Morning', memberIds: ['a', 'b'], captainId: 'a', backupDriverIds: [], acceptedIds: ['a', 'b'],
  status: 'active', days: [1, 2, 3, 4, 5], outTime: '08:00', backTime: null, pickupNote: '', waitLimitMin: 10,
  scores: {}, lastDroveOn: {}, createdBy: 'a', createdAt: '2026-01-01T00:00:00Z',
};
const trip: Trip = {
  id: '2026-10-27_out', date: '2026-10-27', leg: 'out', driverId: 'a', riderIds: ['b'], absentIds: [],
  status: 'planned', applied: false, completedBy: null, completedAt: null, cost: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('TripActionBar', () => {
  it('hides "Can\'t go" once the absence cutoff passes while the screen stays open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T11:58:00Z')); // Mon 20:58 KST; Tuesday's cutoff is 21:00
    render(
      <GroupContext.Provider value={{ group, me, isAdmin: false, refresh: () => undefined }}>
        <TripActionBar crew={crew} trip={trip} names={new Map()} />
      </GroupContext.Provider>,
    );
    expect(screen.queryByTestId('trip-absent-toggle')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(screen.queryByTestId('trip-absent-toggle')).not.toBeInTheDocument();
  });
});
