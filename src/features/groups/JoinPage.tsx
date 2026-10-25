import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { LinkIcon } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useAuth } from '../../app/providers/auth';
import { PageBody } from '../../app/shell/PageBody';
import { getMember } from '../../data/members';
import { joinGroup, lookupInvite } from '../../data/groups';
import { inviteNameFrom, invitePath, inviteSharePath } from '../../domain/deeplinks';
import { useLoad } from '../../shared/lib/loadable';
import { useAction } from '../../shared/lib/useAction';
import { Banner, Button, Card, EmptyState, Skeleton, TopBar } from '../../shared/ui';
import { isDefaultDisplayName } from '../auth/authService';
import { NameForm } from '../auth/NameForm';
import { SignInBlock } from '../auth/SignInBlock';

/**
 * Invite landing, reachable signed out: the group behind the link, sign-in inline, a name when the
 * account has none yet, then one button to join. Invite documents are readable only when signed in,
 * so before sign-in the name comes from the link itself and is verified after.
 */
export function JoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const linkedName = inviteNameFrom(params);
  const uid = user?.uid ?? null;
  const [invite, reload] = useLoad(async () => {
    if (!uid) return null;
    const found = await lookupInvite(code);
    if (!found) return { found: null, membership: null };
    const membership = await getMember(found.groupId, uid);
    return { found, membership };
  }, [code, uid]);
  const join = useAction(async () => {
    if (!profile) return;
    const gid = await joinGroup(code, profile);
    navigate(`/g/${gid}/profile`, { replace: true });
  }, { report: 'inline' });

  const next = linkedName ? inviteSharePath(code, linkedName) : invitePath(code);
  const skeleton = (
    <Card className="flex flex-col gap-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-13 mt-2" />
    </Card>
  );

  return (
    <>
      <TopBar title={t('join.title')} />
      <PageBody>
        {loading && skeleton}

        {!loading && !user && (
          <>
            <Card padding="lg">
              <p className="text-sub font-medium text-ink-2">{t('join.groupLabel')}</p>
              <h2 className="mt-1 text-title-1 text-ink" data-testid="join-group-name">
                {linkedName || t('join.title')}
              </h2>
              {/* The name is the heading already; the sentence says what joining gives, not the name again. */}
              <p className="mt-2 text-body text-ink-2">{linkedName ? t('ux2.join.whatYouGet') : t('join.invitedGeneric')}</p>
              <p className="mt-1 text-sub text-ink-2">{t('join.signInToJoin')}</p>
            </Card>
            <Card padding="lg">
              <SignInBlock next={next} />
            </Card>
            <p className="text-center text-caption text-ink-3">{t('signin.consent')}</p>
          </>
        )}

        {!loading && user && !profile && (
          <Banner variant="danger" title={t('auth.profileError')} action={<Button variant="secondary" onClick={() => window.location.reload()}>{t('common.reload')}</Button>} />
        )}
        {!loading && user && profile && invite.status === 'loading' && skeleton}
        {!loading && user && invite.status === 'error' && <ErrorBanner error={invite.error} onRetry={reload} />}
        {!loading && user && invite.status === 'ready' && invite.data && !invite.data.found && (
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
        {!loading && user && profile && invite.status === 'ready' && invite.data?.found && (
          <Card padding="lg" className="flex flex-col gap-5">
            <div>
              <p className="text-sub font-medium text-ink-2">{t('join.groupLabel')}</p>
              <h2 className="mt-1 text-title-1 text-ink" data-testid="join-group-name">
                {invite.data.found.groupName}
              </h2>
              <p className="mt-2 text-body text-ink-2">{t('ux2.join.whatYouGet')}</p>
            </div>
            {invite.data.membership?.status === 'active' ? (
              <Banner variant="info" title={t('join.alreadyMember')} data-testid="join-already-member" action={<Button variant="secondary" onClick={() => navigate(`/g/${invite.data?.found?.groupId ?? ''}`, { replace: true })}>{t('join.goToGroup')}</Button>}>
                {t('join.alreadyMemberHint')}
              </Banner>
            ) : invite.data.membership?.status === 'removed' ? (
              <Banner variant="danger" title={t('join.removedTitle')} data-testid="join-removed">
                {t('join.removed')}
              </Banner>
            ) : isDefaultDisplayName(profile.displayName) ? (
              <div className="flex flex-col gap-3">
                <p className="text-sub text-ink-2">{t('join.nameFirst')}</p>
                <NameForm submitLabel={t('common.continue')} />
              </div>
            ) : (
              <>
                <p className="text-sub text-ink-2">{t('join.joinAs', { name: profile.displayName })}</p>
                {join.error && <Banner variant="danger">{join.error}</Banner>}
                <Button size="lg" fullWidth loading={join.busy} loadingLabel={t('join.joining')} onClick={() => join.run()} data-testid="join-submit">
                  {t('join.submit')}
                </Button>
              </>
            )}
          </Card>
        )}
      </PageBody>
    </>
  );
}
