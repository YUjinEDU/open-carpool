import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { LoadingState } from '../../app/fallbacks';
import { useSession } from '../../app/providers/session';
import { joinGroup, lookupInvite } from '../../data/groups';
import { useLoad } from '../../shared/lib/loadable';
import { useAction } from '../../shared/lib/useAction';

export function JoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const { profile } = useSession();
  const [invite] = useLoad(() => lookupInvite(code), [code]);
  const join = useAction(async () => {
    const gid = await joinGroup(code, profile);
    navigate(`/g/${gid}/profile`);
  });

  return (
    <main className="p-4">
      {invite.status === 'loading' && <LoadingState />}
      {invite.status === 'error' && <p role="alert">{t('common.errorWith', { message: invite.error.message })}</p>}
      {invite.status === 'ready' && !invite.data && (
        <>
          <h1>{t('join.title')}</h1>
          <p role="alert" data-testid="join-not-found">
            {t('join.notFound')}
          </p>
          <Link to="/">{t('notFound.home')}</Link>
        </>
      )}
      {invite.status === 'ready' && invite.data && (
        <>
          <h1>{t('join.title')}</h1>
          <p data-testid="join-group-name">{t('join.invitedTo', { name: invite.data.groupName })}</p>
          <button type="button" onClick={() => join.run()} disabled={join.busy} data-testid="join-submit">
            {t('join.submit')}
          </button>
        </>
      )}
    </main>
  );
}
