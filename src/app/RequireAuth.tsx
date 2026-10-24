import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { LoadingState } from './fallbacks';
import { InstallHint } from './InstallHint';
import { useAuth } from './providers/auth';
import { SessionContext, type Session } from './providers/session';

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
  if (!session) return <p role="alert">{t('auth.profileError')}</p>;
  return (
    <SessionContext.Provider value={session}>
      <header className="p-4">
        <Link to="/" data-testid="nav-my-groups">
          {t('app.name')}
        </Link>{' '}
        <Link to="/me" data-testid="nav-me">
          {t('nav.me')}
        </Link>
      </header>
      <InstallHint />
      <Outlet />
    </SessionContext.Provider>
  );
}
