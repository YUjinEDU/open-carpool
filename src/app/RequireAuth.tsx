import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { isDefaultDisplayName } from '../features/auth/authService';
import { NameForm } from '../features/auth/NameForm';
import { Button, EmptyState } from '../shared/ui';
import { LoadingState } from './fallbacks';
import { InstallHint } from './InstallHint';
import { useAuth } from './providers/auth';
import { SessionContext, type Session } from './providers/session';
import { PageBody } from './shell/PageBody';
import { ScrollReset } from './shell/ScrollReset';

/** First sign-in without a name (email link): ask once, before any group sees the placeholder. */
function NameGate() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pb-safe pt-10" data-testid="name-gate">
      <h1 className="text-title-1 text-ink">{t('auth.nameTitle')}</h1>
      <p className="mb-6 mt-2 text-body text-ink-2">{t('auth.nameBody')}</p>
      <NameForm />
    </main>
  );
}

/** Guard for every signed-in route: sends visitors to /signin?next=<current path>. */
export function RequireAuth() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const session = useMemo<Session | null>(() => (user && profile ? { user, profile } : null), [user, profile]);

  if (loading) return <LoadingState />;
  if (!user) {
    const path = location.pathname + location.search;
    return <Navigate to={path === '/' ? '/signin' : `/signin?next=${encodeURIComponent(path)}`} replace />;
  }
  if (!session) {
    return (
      <PageBody className="justify-center pt-16" role="alert">
        <EmptyState
          icon={<AlertCircle />}
          title={t('auth.profileError')}
          action={<Button onClick={() => window.location.reload()}>{t('common.reload')}</Button>}
        />
      </PageBody>
    );
  }
  if (isDefaultDisplayName(session.profile.displayName)) return <NameGate />;
  return (
    <SessionContext.Provider value={session}>
      <ScrollReset />
      <Outlet />
      <InstallHint />
    </SessionContext.Provider>
  );
}
