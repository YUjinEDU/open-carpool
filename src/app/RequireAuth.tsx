import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { Button, EmptyState } from '../shared/ui';
import { LoadingState } from './fallbacks';
import { InstallHint } from './InstallHint';
import { useAuth } from './providers/auth';
import { SessionContext, type Session } from './providers/session';
import { PageBody } from './shell/PageBody';
import { ScrollReset } from './shell/ScrollReset';

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
  return (
    <SessionContext.Provider value={session}>
      <ScrollReset />
      <Outlet />
      <InstallHint />
    </SessionContext.Provider>
  );
}
