import { useTranslation } from 'react-i18next';
import { LoadingState } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { removeMember, setMemberRole } from '../../data/members';
import type { Member } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { useMembers } from './hooks';

type AssignableRole = 'admin' | 'member';
const ASSIGNABLE_ROLES: readonly AssignableRole[] = ['member', 'admin'];
const isAssignableRole = (v: string): v is AssignableRole => ASSIGNABLE_ROLES.some((r) => r === v);

export function MembersPage() {
  const { t } = useTranslation();
  const { group, me, isAdmin } = useGroup();
  const [members, reload] = useMembers(group.id);
  const changeRole = useAction(async (uid: string, role: AssignableRole) => {
    await setMemberRole(group.id, uid, role);
    reload();
  });
  const remove = useAction(async (member: Member) => {
    if (!window.confirm(t('members.removeConfirm', { name: member.displayName }))) return;
    await removeMember(group.id, member.uid);
    reload();
  });

  const canManage = (m: Member) => isAdmin && m.uid !== me.uid && m.role !== 'owner';

  return (
    <main className="p-4">
      <h1>{t('members.title')}</h1>
      {members.status === 'loading' && <LoadingState />}
      {members.status === 'error' && <p role="alert">{t('common.errorWith', { message: members.error.message })}</p>}
      {members.status === 'ready' && (
        <ul data-testid="member-list">
          {members.data
            .filter((m) => m.status === 'active')
            .map((m) => (
              <li key={m.uid} data-testid="member-row">
                <span data-testid="member-name">{m.displayName}</span> <span>{t(`role.${m.role}`)}</span>{' '}
                {m.canDrive && <span>{t('members.driver', { seats: m.seats })}</span>}
                {canManage(m) && (
                  <>
                    <label htmlFor={`member-role-${m.uid}`}>{t('members.role')}</label>
                    <select
                      id={`member-role-${m.uid}`}
                      value={m.role}
                      disabled={changeRole.busy}
                      onChange={(e) => isAssignableRole(e.target.value) && changeRole.run(m.uid, e.target.value)}
                      data-testid="member-role"
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`role.${role}`)}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => remove.run(m)} disabled={remove.busy} data-testid="member-remove">
                      {t('members.remove')}
                    </button>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}
    </main>
  );
}
