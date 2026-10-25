import { useMemo } from 'react';
import { FirebaseError } from 'firebase/app';
import { Outlet, useParams } from 'react-router';
import { getGroup } from '../data/groups';
import { getMember } from '../data/members';
import type { Group } from '../domain/types';
import { useLoad } from '../shared/lib/loadable';
import { LoadErrorState, LoadingState, NotFoundPage } from './fallbacks';
import { NotMemberState } from './GroupLayoutNotMember';
import { GroupContext, type GroupContextValue } from './providers/group';
import { useSession } from './providers/session';
import { GroupNav } from './shell/GroupNav';

/** The rules hide a group from non-members: that denial is the answer "not a member", not a failure. */
const groupIfMember = (gid: string): Promise<Group | null> =>
  getGroup(gid).catch((e: unknown) => {
    if (e instanceof FirebaseError && e.code === 'permission-denied') return null;
    throw e;
  });

/**
 * Loads `/g/:gid` and my membership. A signed-in visitor who is not an active member is told so and offered
 * the invite-code way in; a load failure gets a retry. Pages render their own TopBar and a PageBody with
 * `nav`; the fixed BottomNav lives here.
 */
export function GroupLayout() {
  const { gid = '' } = useParams();
  const { user } = useSession();
  const [state, refresh] = useLoad(
    async () => {
      const [group, me] = await Promise.all([groupIfMember(gid), getMember(gid, user.uid)]);
      return { gid, group, me };
    },
    [gid, user.uid],
  );
  const value = useMemo<GroupContextValue | null>(() => {
    if (state.status !== 'ready') return null;
    const { group, me } = state.data;
    if (!group || !me || me.status !== 'active') return null;
    return { group, me, isAdmin: me.role === 'owner' || me.role === 'admin', refresh };
  }, [state, refresh]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <LoadErrorState error={state.error} onRetry={refresh} />;
  // The router keeps this layout mounted across groups: wait for the new group to load.
  if (state.data.gid !== gid) return <LoadingState />;
  if (!value) {
    // An active membership of a group that no longer exists: the page is missing, not the membership.
    if (state.data.group === null && state.data.me?.status === 'active') return <NotFoundPage />;
    return <NotMemberState membership={state.data.me} />;
  }

  return (
    <GroupContext.Provider value={value}>
      <Outlet />
      <GroupNav />
    </GroupContext.Provider>
  );
}
