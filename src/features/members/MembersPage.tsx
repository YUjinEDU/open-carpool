import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Search, Share2, UserPlus } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { InviteSheet } from '../../app/shell/InviteShare';
import { PageBody } from '../../app/shell/PageBody';
import { removeMember, setMemberRole } from '../../data/members';
import type { Member } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Badge, Button, Dialog, EmptyState, IconButton, Input, List, ListItem, Select, Sheet, Skeleton, TopBar } from '../../shared/ui';
import { useMembers } from './hooks';

type AssignableRole = 'admin' | 'member';
const ASSIGNABLE_ROLES: readonly AssignableRole[] = ['member', 'admin'];
const isAssignableRole = (v: string): v is AssignableRole => ASSIGNABLE_ROLES.some((r) => r === v);
const SEARCH_THRESHOLD = 8;

export function MembersPage() {
  const { t } = useTranslation();
  const { group, me, isAdmin } = useGroup();
  const [members, reload] = useMembers(group.id);
  const [query, setQuery] = useState('');
  const [invite, setInvite] = useState(false);
  const [managing, setManaging] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const changeRole = useAction(async (uid: string, role: AssignableRole) => {
    await setMemberRole(group.id, uid, role);
    setManaging(null);
    reload();
  });
  const remove = useAction(async (member: Member) => {
    await removeMember(group.id, member.uid);
    setRemoving(null);
    setManaging(null);
    reload();
  });

  const active = useMemo(() => (members.status === 'ready' ? members.data.filter((m) => m.status === 'active') : []), [members]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? active.filter((m) => m.displayName.toLowerCase().includes(needle)) : active;
  }, [active, query]);
  const canManage = (m: Member) => isAdmin && m.uid !== me.uid && m.role !== 'owner';
  const description = (m: Member) =>
    [m.areaLabel || t('members.noArea'), m.canDrive ? t('members.driver', { seats: m.seats }) : t('members.rider')].join(' · ');
  const roleBadge = (m: Member) =>
    m.role === 'owner' ? <Badge variant="brand">{t('role.owner')}</Badge> : m.role === 'admin' ? <Badge variant="brand">{t('role.admin')}</Badge> : undefined;

  return (
    <>
      <TopBar title={t('members.title')} trailing={<IconButton label={t('members.invite')} icon={<UserPlus />} onClick={() => setInvite(true)} data-testid="members-invite" />} />
      <PageBody nav>
        {members.status === 'loading' && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        )}
        {members.status === 'error' && <ErrorBanner error={members.error} onRetry={reload} />}
        {members.status === 'ready' && active.length > SEARCH_THRESHOLD && (
          <Input
            id="members-search"
            label={t('members.search')}
            labelHidden
            type="search"
            inputMode="search"
            placeholder={t('members.search')}
            leading={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {members.status === 'ready' && active.length <= 1 && (
          <EmptyState
            icon={<Share2 />}
            title={t('members.empty')}
            description={t('members.emptyHint')}
            action={<Button onClick={() => setInvite(true)}>{t('members.shareInvite')}</Button>}
          />
        )}
        {members.status === 'ready' && active.length > 1 && shown.length === 0 && <EmptyState compact title={t('members.searchEmpty')} />}
        {members.status === 'ready' && shown.length > 0 && (
          <List data-testid="member-list">
            {shown.map((m) => (
              <ListItem
                key={m.uid}
                leading={<Avatar name={m.displayName} size="md" />}
                title={<span data-testid="member-name">{m.uid === me.uid ? `${m.displayName} (${t('common.me')})` : m.displayName}</span>}
                description={description(m)}
                trailing={
                  <>
                    {roleBadge(m)}
                    {canManage(m) && (
                      <IconButton label={t('members.manage', { name: m.displayName })} icon={<MoreHorizontal />} onClick={() => setManaging(m)} className="-my-2 -mr-2" data-testid="member-manage" />
                    )}
                  </>
                }
                data-testid="member-row"
              />
            ))}
          </List>
        )}
      </PageBody>

      <InviteSheet open={invite} onClose={() => setInvite(false)} group={group} />

      <Sheet open={managing !== null} onClose={() => setManaging(null)} title={managing?.displayName ?? t('members.manageTitle')} description={managing ? description(managing) : undefined} closeLabel={t('common.close')}>
        {managing && (
          <div className="flex flex-col gap-4">
            <Select
              id={`member-role-${managing.uid}`}
              label={t('members.role')}
              value={managing.role === 'admin' ? 'admin' : 'member'}
              disabled={changeRole.busy}
              onChange={(e) => isAssignableRole(e.target.value) && changeRole.run(managing.uid, e.target.value)}
              data-testid="member-role"
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`role.${role}`)}
                </option>
              ))}
            </Select>
            <Button variant="ghost" className="self-start text-danger-ink hover:bg-danger-wash" onClick={() => setRemoving(managing)} data-testid="member-remove">
              {t('members.remove')}
            </Button>
          </div>
        )}
      </Sheet>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        role="alertdialog"
        title={t('members.removeConfirm', { name: removing?.displayName ?? '' })}
        description={t('members.removeBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={remove.busy} loadingLabel={t('members.removing')} onClick={() => removing && remove.run(removing)} data-testid="member-remove-confirm">
              {t('members.remove')}
            </Button>
          </>
        }
      />
    </>
  );
}
