import { useMemo } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { getGroup } from '../data/groups';
import { getMember } from '../data/members';
import { useLoad } from '../shared/lib/loadable';
import { LoadingState } from './fallbacks';
import { GroupContext, type GroupContextValue } from './providers/group';
import { useSession } from './providers/session';
import { GroupNav } from './shell/GroupNav';

/**
 * Loads `/g/:gid` and my membership; anyone who is not an active member is sent to `/`.
 * Pages render their own TopBar and a PageBody with `nav`; the fixed BottomNav lives here.
 */
export function GroupLayout() {
  const { gid = '' } = useParams();
  const { user } = useSession();
  const [state, refresh] = useLoad(
    async () => {
      const [group, me] = await Promise.all([getGroup(gid), getMember(gid, user.uid)]);
      return { group, me };
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
  if (!value) return <Navigate to="/" replace />;
  // The router keeps this layout mounted across groups: wait for the new group to load.
  if (value.group.id !== gid) return <LoadingState />;

  return (
    <GroupContext.Provider value={value}>
      <Outlet />
      <GroupNav />
    </GroupContext.Provider>
  );
}
