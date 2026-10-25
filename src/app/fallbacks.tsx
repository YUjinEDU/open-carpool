import { useTranslation } from 'react-i18next';
import { useNavigate, isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertCircle, SearchX } from 'lucide-react';
import { describeError } from '../shared/lib/useAction';
import { Banner, Button, EmptyState, Skeleton } from '../shared/ui';
import { PageBody } from './shell/PageBody';

/**
 * First paint of a page: a bar shaped like the TopBar (same height, surface and hairline, so the header
 * never disappears between routes), then skeletons shaped like a card and a list.
 */
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')}>
      <div aria-hidden="true" className="sticky top-0 z-20 bg-surface/92 pt-safe backdrop-blur-md hairline-bottom">
        <div className="mx-auto flex h-(--topbar-height) w-full max-w-md items-center px-5">
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export interface ErrorBannerProps {
  readonly error: Error;
  readonly onRetry?: () => void;
  readonly title?: string;
  readonly className?: string;
}

/** Load failure next to the thing that failed, with the cause (a plain sentence, never SDK text) and a retry. */
export function ErrorBanner({ error, onRetry, title, className }: ErrorBannerProps) {
  const { t } = useTranslation();
  return (
    <Banner
      variant="danger"
      title={title ?? t('common.loadFailed')}
      className={className}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    >
      {describeError(error)}
    </Banner>
  );
}

export interface LoadErrorStateProps {
  readonly error: Error;
  readonly onRetry: () => void;
}

/** A whole page that could not load (no TopBar yet): the cause in a plain sentence and a retry. */
export function LoadErrorState({ error, onRetry }: LoadErrorStateProps) {
  const { t } = useTranslation();
  return (
    <PageBody className="justify-center pt-16" role="alert">
      <EmptyState icon={<AlertCircle />} title={t('common.loadFailed')} description={describeError(error)} action={<Button onClick={onRetry}>{t('common.retry')}</Button>} />
    </PageBody>
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
  const message = isRouteErrorResponse(error) ? error.statusText : describeError(error);
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
