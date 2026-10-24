import type { User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { showToast } from '../../shared/ui';
import { upsertProfile } from '../../data/users';
import type { UserProfile } from '../../domain/types';
import { ensureUserProfile, onAuthChange } from '../../features/auth/authService';
import { describeError } from '../../shared/lib/useAction';

export interface AuthContextValue {
  readonly user: User | null;
  /** null while loading, when signed out, or when the profile could not be loaded. */
  readonly profile: UserProfile | null;
  readonly loading: boolean;
  readonly saveProfile: (profile: UserProfile) => Promise<void>;
}

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

  const value = useMemo(() => ({ ...state, saveProfile }), [state, saveProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
