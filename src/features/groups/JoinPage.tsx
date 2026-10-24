import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { LinkIcon } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useSession } from '../../app/providers/session';
import { PageBody } from '../../app/shell/PageBody';
import { joinGroup, lookupInvite } from '../../data/groups';
import { useLoad } from '../../shared/lib/loadable';
import { useAction } from '../../shared/lib/useAction';
import { Button, Card, EmptyState, Skeleton, TopBar } from '../../shared/ui';

/** Invite landing: the group behind the code and one button to join. */
export function JoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const { profile } = useSession();
  const [invite, reload] = useLoad(() => lookupInvite(code), [code]);
  const join = useAction(async () => {
    const gid = await joinGroup(code, profile);
    navigate(`/g/${gid}/profile`);
  });

  return (
    <>
      <TopBar title={t('join.title')} />
      <PageBody>
        {invite.status === 'loading' && (
          <Card className="flex flex-col gap-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-13 mt-2" />
          </Card>
        )}
        {invite.status === 'error' && <ErrorBanner error={invite.error} onRetry={reload} />}
        {invite.status === 'ready' && !invite.data && (
          <Card padding="none">
            <EmptyState
              icon={<LinkIcon />}
              title={t('join.notFound')}
              description={t('join.notFoundHint')}
              data-testid="join-not-found"
              action={<Button variant="secondary" onClick={() => navigate('/')}>{t('join.enterCode')}</Button>}
            />
          </Card>
        )}
        {invite.status === 'ready' && invite.data && (
          <Card padding="lg" className="flex flex-col gap-5">
            <div>
              <p className="text-sub font-medium text-ink-2">{t('join.groupLabel')}</p>
              <h2 className="mt-1 text-title-1 text-ink" data-testid="join-group-name">
                {invite.data.groupName}
              </h2>
              <p className="mt-2 text-body text-ink-2">{t('join.invitedTo', { name: invite.data.groupName })}</p>
            </div>
            <Button size="lg" fullWidth loading={join.busy} loadingLabel={t('join.joining')} onClick={() => join.run()} data-testid="join-submit">
              {t('join.submit')}
            </Button>
          </Card>
        )}
      </PageBody>
    </>
  );
}
