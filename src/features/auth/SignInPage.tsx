import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../../app/providers/auth';
import { safeNext } from './next';
import { SignInBlock } from './SignInBlock';

/** Landing + sign-in: one tap from a KakaoTalk link to a session, with the in-app browser escape hatch. */
export function SignInPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  if (user) return <Navigate to={next} replace />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-14">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-display text-ink">{t('signin.wordmark')}</h1>
        <p className="text-body text-ink-2">{t('signin.subtitle')}</p>
      </div>
      <SignInBlock next={next} />
      <p className="mt-auto pt-8 text-center text-caption text-ink-3">{t('signin.consent')}</p>
    </main>
  );
}
