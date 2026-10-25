import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../domain/types';
import i18n from '../../shared/i18n';

const mocks = vi.hoisted(() => ({ patch: vi.fn<(uid: string, fields: object) => Promise<void>>() }));

vi.mock('../../firebase', () => ({}));
vi.mock('../../data/users', () => ({ patchProfile: mocks.patch, upsertProfile: vi.fn() }));
vi.mock('../../data/members', () => ({ setDisplayNameEverywhere: vi.fn() }));
vi.mock('../auth/authService', () => ({
  signOut: vi.fn(),
  onAuthChange: (cb: (u: { uid: string }) => void) => {
    cb({ uid: 'u1' });
    return () => undefined;
  },
  ensureUserProfile: () => Promise.resolve(profile),
}));

import { AuthProvider, useAuth } from '../../app/providers/auth';
import { SessionContext } from '../../app/providers/session';
import { MePage } from './MePage';

const profile: UserProfile = { uid: 'u1', displayName: 'Kim', email: 'k@x.kr', photoURL: null, locale: 'ko' } as UserProfile;

/** What <RequireAuth> does: hand the auth profile to the routes below it. */
function Session({ children }: { readonly children: ReactNode }) {
  const { user, profile: p } = useAuth();
  if (!user || !p) return null;
  return <SessionContext.Provider value={{ user, profile: p }}>{children}</SessionContext.Provider>;
}

function SessionLocale() {
  return <p data-testid="session-locale">{useAuth().profile?.locale}</p>;
}

/** Me page that can be left and re-entered, like navigating to a group and back. */
function Harness() {
  const [onMe, setOnMe] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOnMe((v) => !v)}>
        toggle
      </button>
      <SessionLocale />
      {onMe ? <MePage /> : null}
    </>
  );
}

const renderMe = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Session>
          <Harness />
        </Session>
      </AuthProvider>
    </MemoryRouter>,
  );

const pressed = () => screen.getByTestId('me-locale').querySelector('[aria-checked="true"], [aria-pressed="true"]')?.textContent;

describe('MePage language', () => {
  beforeEach(async () => {
    mocks.patch.mockReset();
    await i18n.changeLanguage('ko');
  });

  it('updates the session profile locale when the language changes', async () => {
    mocks.patch.mockResolvedValue();
    renderMe();
    fireEvent.click(await screen.findByRole('radio', { name: /English/ }));
    await waitFor(() => expect(screen.getByTestId('session-locale').textContent).toBe('en'));
    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByText('toggle'));
    expect(pressed()).toMatch(/English/);
  });

  it('reverts to the last saved language, not the one the session started with, when a write fails', async () => {
    mocks.patch.mockResolvedValueOnce();
    renderMe();
    fireEvent.click(await screen.findByRole('radio', { name: /English/ }));
    await waitFor(() => expect(screen.getByTestId('session-locale').textContent).toBe('en'));
    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByText('toggle'));
    mocks.patch.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('radio', { name: /한국어/ }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(pressed()).toMatch(/English/));
    expect(screen.getByTestId('session-locale').textContent).toBe('en');
  });
});
