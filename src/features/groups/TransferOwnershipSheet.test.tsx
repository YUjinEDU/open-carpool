import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FirebaseError } from 'firebase/app';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../shared/i18n';
import { GroupContext, type GroupContextValue } from '../../app/providers/group';
import type { Group, Member } from '../../domain/types';
import { TransferOwnershipSheet } from './TransferOwnershipSheet';

// The data layer is the seam: the transfer and the leave are the two writes under test.
vi.mock('../../firebase', () => ({ db: {}, auth: {} }));
const data = vi.hoisted(() => ({ transferOwnership: vi.fn(), leaveGroup: vi.fn(), listMembers: vi.fn() }));
vi.mock('../../data/groups', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/groups')>()),
  transferOwnership: data.transferOwnership,
}));
vi.mock('../../data/members', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/members')>()),
  leaveGroup: data.leaveGroup,
  listMembers: data.listMembers,
}));

// jsdom has no modal dialogs: open/close is all the sheet needs here.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); };

const group: Group = {
  id: 'g1', name: 'Acme', type: 'company', country: 'KR', locale: 'ko', ownerId: 'a', inviteCode: 'ABCDEFGH',
  allowedEmailDomains: [], destination: null, policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
  createdAt: '2026-01-01T00:00:00Z',
};
const member = (uid: string, role: Member['role']): Member => ({
  uid, displayName: uid.toUpperCase(), role, status: 'active', canDrive: false, seats: 0, plateLastDigit: null,
  areaLabel: '', area: null, schedule: {}, joinedAt: '2026-01-01T00:00:00Z', inviteCode: 'ABCDEFGH',
});

function wrap(value: GroupContextValue, children: ReactNode) {
  return (
    <MemoryRouter>
      <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  data.listMembers.mockResolvedValue([member('a', 'owner'), member('b', 'member')]);
  data.transferOwnership.mockResolvedValue(undefined);
});

describe('TransferOwnershipSheet in leave mode', () => {
  it('retries only the leave after the transfer went through and the leave failed', async () => {
    data.leaveGroup.mockRejectedValueOnce(new FirebaseError('unavailable', 'offline')).mockResolvedValueOnce(undefined);
    const refresh = vi.fn();
    const owner: GroupContextValue = { group, me: member('a', 'owner'), isAdmin: true, refresh };
    const sheet = <TransferOwnershipSheet open onClose={() => undefined} leaveAfter />;
    const { rerender } = render(wrap(owner, sheet));
    fireEvent.click(await screen.findByTestId('transfer-pick-b'));
    fireEvent.click(screen.getByTestId('transfer-confirm'));
    expect(await screen.findByTestId('transfer-leave-error')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();

    // What refresh() brings back: b owns the group, I am an admin.
    rerender(wrap({ group: { ...group, ownerId: 'b' }, me: member('a', 'admin'), isAdmin: true, refresh }, sheet));
    await act(async () => {
      fireEvent.click(screen.getByTestId('transfer-confirm'));
    });

    await waitFor(() => expect(data.leaveGroup).toHaveBeenCalledTimes(2));
    expect(data.transferOwnership).toHaveBeenCalledTimes(1);
  });
});
