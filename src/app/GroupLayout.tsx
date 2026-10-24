import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, NavLink, Outlet, useParams } from 'react-router';
import { getGroup } from '../data/groups';
import { getMember } from '../data/members';
import { useLoad } from '../shared/lib/loadable';
import { LoadingState } from './fallbacks';
import { GroupContext, type GroupContextValue } from './providers/group';
import { useSession } from './providers/session';

/** Loads `/g/:gid` and my membership; anyone who is not an active member is sent to `/`. */
export function GroupLayout() {
  const { t } = useTranslation();
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

  const tabs = [
    { to: '', key: 'home', end: true },
    { to: 'crews', key: 'crews' },
    { to: 'events', key: 'events' },
    { to: 'members', key: 'members' },
    { to: 'profile', key: 'profile' },
    ...(value.isAdmin ? [{ to: 'settings', key: 'settings' }, { to: 'admin', key: 'admin' }] : []),
  ];
  return (
    <GroupContext.Provider value={value}>
      <nav aria-label={t('nav.group')} className="p-4">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.key}>
              <NavLink to={tab.to} end={tab.end} data-testid={`nav-${tab.key}`}>
                {t(`nav.${tab.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </GroupContext.Provider>
  );
}
