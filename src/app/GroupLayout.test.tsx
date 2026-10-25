import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FirebaseError } from 'firebase/app';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../shared/i18n';
import { GroupLayout } from './GroupLayout';

// The data layer is the seam: what Firestore (under the rules) answers for the group and my member doc.
vi.mock('../firebase', () => ({ db: {}, auth: {} }));
const data = vi.hoisted(() => ({
  readGroup: vi.fn(),
  getGroup: vi.fn(),
  getMember: vi.fn(),
  deleteGroup: vi.fn(),
  leaveGroup: vi.fn(),
}));
vi.mock('../data/groups', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/groups')>()),
  readGroup: data.readGroup,
  getGroup: data.getGroup,
  deleteGroup: data.deleteGroup,
}));
vi.mock('../data/members', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/members')>()),
  getMember: data.getMember,
  leaveGroup: data.leaveGroup,
}));
vi.mock('./providers/session', () => ({ useSession: () => ({ user: { uid: 'u1' } }) }));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/g/:gid" element={<GroupLayout />} />
        <Route path="/" element={<p data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  data.getMember.mockResolvedValue(null);
});

describe('GroupLayout for a visitor without a membership', () => {
  it('says the group was deleted when the group doc is a tombstone', async () => {
    data.readGroup.mockResolvedValue({ id: 'g1', deleted: true, deletedAt: '2026-10-25T00:00:00.000Z' });
    data.getGroup.mockResolvedValue(null);
    renderAt('/g/g1');
    expect(await screen.findByTestId('group-deleted')).toBeInTheDocument();
    expect(screen.queryByTestId('group-not-member')).not.toBeInTheDocument();
  });

  it('offers the invite-code way in when the rules hide a live group', async () => {
    const denied = new FirebaseError('permission-denied', 'denied');
    data.readGroup.mockRejectedValue(denied);
    data.getGroup.mockRejectedValue(denied);
    renderAt('/g/g1');
    expect(await screen.findByTestId('group-not-member')).toBeInTheDocument();
    expect(screen.queryByTestId('group-deleted')).not.toBeInTheDocument();
  });
});

describe('GroupLayout for a group that is being deleted (W-01)', () => {
  const deleting = {
    id: 'g1', name: 'Acme', type: 'company', country: 'KR', locale: 'ko', ownerId: 'u1', inviteCode: 'ABCDEFGH',
    allowedEmailDomains: [], destination: null, policy: { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' },
    createdAt: '2026-10-24T00:00:00.000Z', deleting: true,
  };
  const membership = (role: 'owner' | 'member') => ({
    uid: 'u1', displayName: 'U', role, status: 'active', canDrive: false, seats: 0, plateLastDigit: null, areaLabel: '',
    area: null, schedule: {}, joinedAt: '2026-10-24T00:00:00.000Z', inviteCode: 'ABCDEFGH',
  });

  it('lets the owner finish the delete', async () => {
    data.readGroup.mockResolvedValue(deleting);
    data.getMember.mockResolvedValue(membership('owner'));
    data.deleteGroup.mockResolvedValue(undefined);
    renderAt('/g/g1');
    fireEvent.click(await screen.findByTestId('group-deleting-finish'));
    await waitFor(() => expect(data.deleteGroup).toHaveBeenCalledWith(deleting, 'u1'));
    expect(await screen.findByTestId('home')).toBeInTheDocument();
    expect(data.leaveGroup).not.toHaveBeenCalled();
  });

  it('lets a member leave instead of opening the frozen pages', async () => {
    data.readGroup.mockResolvedValue({ ...deleting, ownerId: 'u2' });
    data.getMember.mockResolvedValue(membership('member'));
    data.leaveGroup.mockResolvedValue(undefined);
    renderAt('/g/g1');
    expect(await screen.findByTestId('group-deleting')).toBeInTheDocument();
    expect(screen.queryByTestId('group-deleting-finish')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('group-deleting-leave'));
    await waitFor(() => expect(data.leaveGroup).toHaveBeenCalledWith('g1', 'u1'));
    expect(await screen.findByTestId('home')).toBeInTheDocument();
  });
});
