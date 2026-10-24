import { createContext, useContext } from 'react';
import type { Group, Member } from '../../domain/types';

export interface GroupContextValue {
  readonly group: Group;
  /** The signed-in user's active membership in `group`. */
  readonly me: Member;
  readonly isAdmin: boolean;
  /** Re-read the group and my member document (after saving either). */
  readonly refresh: () => void;
}

export const GroupContext = createContext<GroupContextValue | null>(null);

export function useGroup(): GroupContextValue {
  const value = useContext(GroupContext);
  if (!value) throw new Error('useGroup must be used inside <GroupLayout>');
  return value;
}
