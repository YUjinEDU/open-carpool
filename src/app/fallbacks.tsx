import { useTranslation } from 'react-i18next';
import { useNavigate, isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertCircle, SearchX } from 'lucide-react';
import { Banner, Button, EmptyState, Skeleton } from '../shared/ui';
import { PageBody } from './shell/PageBody';

/** First paint of a page: skeletons shaped like a TopBar title, a card and a list. */
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')} className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-5">
      <Skeleton className="h-7 w-2/5" />
      <Skeleton className="h-44" />
      <Skeleton className="h-28" />
    </div>
  );
}

export interface ErrorBannerProps {
  readonly error: Error;
  readonly onRetry?: () => void;
  readonly title?: string;
  readonly className?: string;
}

/** Load failure next to the thing that failed, with the cause and a retry. */
export function ErrorBanner({ error, onRetry, title, className }: ErrorBannerProps) {
  const { t } = useTranslation();
  return (
    <Banner
      variant="danger"
      title={title ?? t('common.loadFailed')}
      className={className}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    >
      {error.message}
    </Banner>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <PageBody className="justify-center pt-16">
      <EmptyState icon={<SearchX />} title={t('notFound.title')} action={<Button onClick={() => navigate('/')}>{t('notFound.home')}</Button>} />
    </PageBody>
  );
}

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : String(error);
  return (
    <PageBody className="justify-center pt-16" role="alert">
      <EmptyState
        icon={<AlertCircle />}
        title={t('common.unexpected')}
        description={message}
        action={<Button onClick={() => window.location.reload()}>{t('common.reload')}</Button>}
      />
    </PageBody>
  );
}
