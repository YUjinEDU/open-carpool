import type { User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { showToast } from '../../shared/ui';
import { setDisplayNameEverywhere } from '../../data/members';
import { patchProfile as writeProfileFields, upsertProfile } from '../../data/users';
import type { UserProfile } from '../../domain/types';
import { ensureUserProfile, onAuthChange } from '../../features/auth/authService';
import { describeError } from '../../shared/lib/useAction';

export interface AuthContextValue {
  readonly user: User | null;
  /** null while loading, when signed out, or when the profile could not be loaded. */
  readonly profile: UserProfile | null;
  readonly loading: boolean;
  readonly saveProfile: (profile: UserProfile) => Promise<void>;
  /** Write only these profile fields to Firestore and mirror them in the session profile. */
  readonly patchProfile: (fields: ProfileFields) => Promise<void>;
  /** Set the display name on the account and on every active membership (one name everywhere). */
  readonly rename: (displayName: string) => Promise<void>;
}

type ProfileFields = Parameters<typeof writeProfileFields>[1];

interface AuthState {
  readonly user: User | null;
  readonly profile: UserProfile | null;
  readonly loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(
    () =>
      onAuthChange((user) => {
        if (!user) {
          setState({ user: null, profile: null, loading: false });
          return;
        }
        setState({ user, profile: null, loading: true });
        ensureUserProfile(user).then(
          (profile) => setState((s) => (s.user?.uid === user.uid ? { user, profile, loading: false } : s)),
          (e: unknown) => {
            showToast(describeError(e), 'error');
            setState((s) => (s.user?.uid === user.uid ? { user, profile: null, loading: false } : s));
          },
        );
      }),
    [],
  );

  const saveProfile = useCallback(async (profile: UserProfile) => {
    await upsertProfile(profile);
    setState((s) => (s.user?.uid === profile.uid ? { ...s, profile } : s));
  }, []);

  const uid = state.user?.uid;
  const patchProfile = useCallback(
    async (fields: ProfileFields) => {
      if (!uid) throw new Error('patchProfile needs a signed-in user');
      await writeProfileFields(uid, fields);
      setState((s) => (s.user?.uid === uid && s.profile ? { ...s, profile: { ...s.profile, ...fields } } : s));
    },
    [uid],
  );

  const rename = useCallback(
    async (displayName: string) => {
      const current = state.profile;
      if (!current) throw new Error('rename needs a loaded profile');
      // Field patch: a stale session copy must not write an older locale back (X-01).
      await patchProfile({ displayName });
      await setDisplayNameEverywhere(current.uid, displayName);
    },
    [state.profile, patchProfile],
  );

  const value = useMemo(() => ({ ...state, saveProfile, patchProfile, rename }), [state, saveProfile, patchProfile, rename]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
