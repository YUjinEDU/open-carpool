import { useMemo } from 'react';
import { FirebaseError } from 'firebase/app';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useParams } from 'react-router';
import { Trash2 } from 'lucide-react';
import { deleteGroup, readGroup, type GroupTombstone } from '../data/groups';
import { getMember, leaveGroup } from '../data/members';
import type { Group, Member } from '../domain/types';
import { useLoad } from '../shared/lib/loadable';
import { useAction } from '../shared/lib/useAction';
import { Banner, Button, EmptyState } from '../shared/ui';
import { LoadErrorState, LoadingState, NotFoundPage } from './fallbacks';
import { NotMemberState } from './GroupLayoutNotMember';
import { GroupContext, type GroupContextValue } from './providers/group';
import { useSession } from './providers/session';
import { GroupNav } from './shell/GroupNav';
import { PageBody } from './shell/PageBody';

/**
 * The rules hide a live group from non-members: that denial is the answer "not a member", not a failure.
 * The tombstone of a deleted group is readable by anyone signed in (V-06).
 */
const groupIfMember = (gid: string): Promise<Group | GroupTombstone | null> =>
  readGroup(gid).catch((e: unknown) => {
    if (e instanceof FirebaseError && e.code === 'permission-denied') return null;
    throw e;
  });

/** `/g/:gid` of a deleted group (bookmark, notification, stale tab): gone, not "you are not a member". */
function GroupDeletedState() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <PageBody className="justify-center pt-16">
      <EmptyState
        icon={<Trash2 />}
        title={t('groupDeleted.title')}
        description={t('groupDeleted.body')}
        action={<Button onClick={() => navigate('/')}>{t('groupDeleted.home')}</Button>}
        data-testid="group-deleted"
      />
    </PageBody>
  );
}

/**
 * A group stuck mid-delete (W-01): every write under it is frozen, so its pages would only fail. The owner
 * can finish the delete (deleteGroup resumes); anyone else can still leave (firestore.rules allows it).
 */
function GroupDeletingState({ group, me }: { readonly group: Group; readonly me: Member }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOwner = group.ownerId === me.uid && me.role === 'owner';
  const action = useAction(async () => {
    if (isOwner) await deleteGroup(group, me.uid);
    else await leaveGroup(group.id, me.uid);
    navigate('/', { replace: true });
  }, { report: 'inline' });
  return (
    <PageBody className="justify-center pt-16">
      <EmptyState
        icon={<Trash2 />}
        title={t('groupDeleting.title')}
        description={t(isOwner ? 'groupDeleting.ownerBody' : 'groupDeleting.memberBody')}
        action={
          <Button
            variant={isOwner ? 'danger' : 'primary'}
            loading={action.busy}
            loadingLabel={t(isOwner ? 'groupDeleting.finishBusy' : 'groupDeleting.leaveBusy')}
            onClick={() => action.run()}
            data-testid={isOwner ? 'group-deleting-finish' : 'group-deleting-leave'}
          >
            {t(isOwner ? 'groupDeleting.finish' : 'groupDeleting.leave')}
          </Button>
        }
        data-testid="group-deleting"
      />
      {action.error && <Banner variant="danger" className="mt-3">{action.error}</Banner>}
    </PageBody>
  );
}

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
    if (!group || 'deleted' in group || !me || me.status !== 'active') return null;
    return { group, me, isAdmin: me.role === 'owner' || me.role === 'admin', refresh };
  }, [state, refresh]);

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <LoadErrorState error={state.error} onRetry={refresh} />;
  // The router keeps this layout mounted across groups: wait for the new group to load.
  if (state.data.gid !== gid) return <LoadingState />;
  if (!value) {
    if (state.data.group !== null && 'deleted' in state.data.group) return <GroupDeletedState />;
    // An active membership of a group that no longer exists: the page is missing, not the membership.
    if (state.data.group === null && state.data.me?.status === 'active') return <NotFoundPage />;
    return <NotMemberState membership={state.data.me} />;
  }
  if (value.group.deleting === true) return <GroupDeletingState group={value.group} me={value.me} />;

  return (
    <GroupContext.Provider value={value}>
      <Outlet />
      <GroupNav />
    </GroupContext.Provider>
  );
}
