import { useTranslation } from 'react-i18next';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export function LoadingState() {
  const { t } = useTranslation();
  return <p role="status">{t('common.loading')}</p>;
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1>{t('notFound.title')}</h1>
      <Link to="/">{t('notFound.home')}</Link>
    </main>
  );
}

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : String(error);
  return (
    <main className="p-4" role="alert">
      <h1>{t('common.unexpected')}</h1>
      <p>{message}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('common.reload')}
      </button>
    </main>
  );
}
