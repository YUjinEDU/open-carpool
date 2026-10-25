import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../shared/i18n';
import type { Group, Member } from '../../domain/types';
import { GroupContext } from '../providers/group';
import { GroupNav } from './GroupNav';

// jsdom has no modal dialogs: open/close is all the sheets need here.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); };

vi.mock('../../firebase', () => ({ db: {}, auth: {} }));
const data = vi.hoisted(() => ({ listMembers: vi.fn() }));
vi.mock('../../data/members', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/members')>()),
  listMembers: data.listMembers,
}));
vi.mock('../../features/crews/hooks', () => ({ useCrews: () => ({ status: 'ready', data: [], retry: () => undefined }) }));

const group: Group = {
  id: 'g1', name: 'Acme', type: 'company', country: 'KR', locale: 'ko', ownerId: 'a', inviteCode: 'ABCDEFGH',
  allowedEmailDomains: [], destination: null, policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
  createdAt: '2026-01-01T00:00:00Z',
};
const owner: Member = {
  uid: 'a', displayName: 'Ann', role: 'owner', status: 'active', canDrive: false, seats: 0, plateLastDigit: null,
  areaLabel: '', area: null, schedule: {}, joinedAt: '2026-01-01T00:00:00Z', inviteCode: 'ABCDEFGH',
};

function renderNav() {
  render(
    <MemoryRouter initialEntries={['/g/g1']}>
      <GroupContext.Provider value={{ group, me: owner, isAdmin: true, refresh: () => undefined }}>
        <GroupNav />
      </GroupContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  data.listMembers.mockResolvedValue([owner]);
});

describe('GroupNav for the owner', () => {
  it('does not load the members while the transfer sheet is closed', () => {
    renderNav();
    expect(data.listMembers).not.toHaveBeenCalled();
  });

  it('offers deleting the group when the owner is the only member and taps leave', async () => {
    renderNav();
    fireEvent.click(screen.getByTestId('nav-more'));
    fireEvent.click(screen.getByTestId('nav-leave-group'));
    fireEvent.click(await screen.findByTestId('transfer-delete-group'));
    expect(screen.getByTestId('group-delete-name').closest('dialog')).toHaveAttribute('open');
  });
});
