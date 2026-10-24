import type { User } from 'firebase/auth';
import { createContext, useContext } from 'react';
import type { UserProfile } from '../../domain/types';

/** A signed-in user with a loaded profile; provided by <RequireAuth> to every protected route. */
export interface Session {
  readonly user: User;
  readonly profile: UserProfile;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <RequireAuth>');
  return value;
}
