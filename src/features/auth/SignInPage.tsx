import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../app/providers/auth';
import { detectInAppBrowser, detectPlatform, externalOpenUrl } from '../../domain/inapp';
import { config } from '../../shared/config';
import { useAction } from '../../shared/lib/useAction';
import { sendEmailSignInLink, signInWithGoogle, signInWithKakao, type SignInResult } from './authService';
import { safeNext } from './next';

export function SignInPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const userAgent = navigator.userAgent;
  const inApp = detectInAppBrowser(userAgent);
  const escapeUrl = externalOpenUrl(inApp, window.location.href, detectPlatform(userAgent));

  const afterProvider = (result: SignInResult) => {
    if (result.status === 'signed-in') navigate(next, { replace: true });
  };
  const google = useAction(async () => afterProvider(await signInWithGoogle()));
  const kakao = useAction(async () => afterProvider(await signInWithKakao()));
  const emailLink = useAction(async (address: string) => {
    const finishUrl = `${window.location.origin}/signin/finish?next=${encodeURIComponent(next)}`;
    await sendEmailSignInLink(address, finishUrl);
    setSentTo(address);
  });

  if (user) return <Navigate to={next} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    emailLink.run(email.trim());
  };

  return (
    <main className="p-4">
      <h1>{t('signin.title')}</h1>
      <p>{t('signin.subtitle')}</p>
      {inApp && (
        <section role="alert" data-testid="inapp-banner">
          <p>{t('signin.inApp.message')}</p>
          {escapeUrl ? (
            <a href={escapeUrl} data-testid="inapp-open-external">
              {t('signin.inApp.open')}
            </a>
          ) : (
            <p>{t('signin.inApp.manual')}</p>
          )}
        </section>
      )}
      <button type="button" onClick={() => google.run()} disabled={google.busy} data-testid="signin-google">
        {t('signin.google')}
      </button>
      {config.kakaoOidcEnabled && (
        <button type="button" onClick={() => kakao.run()} disabled={kakao.busy} data-testid="signin-kakao">
          {t('signin.kakao')}
        </button>
      )}
      <form onSubmit={onSubmit}>
        <label htmlFor="signin-email">{t('signin.emailLabel')}</label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="signin-email"
        />
        <button type="submit" disabled={emailLink.busy} data-testid="signin-email-submit">
          {t('signin.emailSubmit')}
        </button>
      </form>
      {sentTo && (
        <p role="status" data-testid="signin-email-sent">
          {t('signin.emailSent', { email: sentTo })}
        </p>
      )}
    </main>
  );
}
