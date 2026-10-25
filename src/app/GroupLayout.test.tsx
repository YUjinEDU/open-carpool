import { render, screen } from '@testing-library/react';
import { FirebaseError } from 'firebase/app';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../shared/i18n';
import { GroupLayout } from './GroupLayout';

// The data layer is the seam: what Firestore (under the rules) answers for the group and my member doc.
vi.mock('../firebase', () => ({ db: {}, auth: {} }));
const data = vi.hoisted(() => ({ readGroup: vi.fn(), getGroup: vi.fn(), getMember: vi.fn() }));
vi.mock('../data/groups', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/groups')>()),
  readGroup: data.readGroup,
  getGroup: data.getGroup,
}));
vi.mock('../data/members', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/members')>()),
  getMember: data.getMember,
}));
vi.mock('./providers/session', () => ({ useSession: () => ({ user: { uid: 'u1' } }) }));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/g/:gid" element={<GroupLayout />} />
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
