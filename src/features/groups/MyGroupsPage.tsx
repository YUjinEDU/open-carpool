import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { LoadingState } from '../../app/fallbacks';
import { useSession } from '../../app/providers/session';
import { normalizeInviteCode } from '../../data/groups';
import { useMyGroups } from './hooks';

export function MyGroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [groups] = useMyGroups(user.uid);
  const [code, setCode] = useState('');

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/join/${encodeURIComponent(normalizeInviteCode(code))}`);
  };

  return (
    <main className="p-4">
      <h1>{t('myGroups.title')}</h1>
      {groups.status === 'loading' && <LoadingState />}
      {groups.status === 'error' && <p role="alert">{t('common.errorWith', { message: groups.error.message })}</p>}
      {groups.status === 'ready' &&
        (groups.data.length === 0 ? (
          <p data-testid="my-groups-empty">{t('myGroups.empty')}</p>
        ) : (
          <ul data-testid="my-groups">
            {groups.data.map((g) => (
              <li key={g.id}>
                <Link to={`/g/${g.id}`} data-testid="group-link">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      <Link to="/groups/new" data-testid="create-group-link">
        {t('myGroups.create')}
      </Link>
      <form onSubmit={onJoin}>
        <label htmlFor="join-code">{t('myGroups.joinCode')}</label>
        <input id="join-code" required value={code} onChange={(e) => setCode(e.target.value)} data-testid="join-code" />
        <button type="submit" data-testid="join-code-submit">
          {t('myGroups.join')}
        </button>
      </form>
    </main>
  );
}
