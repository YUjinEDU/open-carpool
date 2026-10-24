import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ExternalLink, Globe, Mail, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../app/providers/auth';
import { detectInAppBrowser, detectPlatform, externalOpenUrl } from '../../domain/inapp';
import { config } from '../../shared/config';
import { useAction } from '../../shared/lib/useAction';
import { Banner, Button, Input } from '../../shared/ui';
import { sendEmailSignInLink, signInWithGoogle, signInWithKakao, type SignInResult } from './authService';
import { safeNext } from './next';

/** Landing + sign-in: one tap from a KakaoTalk link to a session, with the in-app browser escape hatch. */
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

  const busy = google.busy || kakao.busy || emailLink.busy;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    emailLink.run(email.trim());
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-safe pt-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-ink">{t('signin.wordmark')}</h1>
        <p className="text-body text-ink-2">{t('signin.subtitle')}</p>
      </div>

      {inApp && (
        <Banner
          variant="warn"
          className="mt-6"
          title={t('signin.inApp.title')}
          data-testid="inapp-banner"
          action={
            escapeUrl ? (
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<ExternalLink />}
                onClick={() => {
                  window.location.href = escapeUrl;
                }}
                data-testid="inapp-open-external"
              >
                {t('signin.inApp.open')}
              </Button>
            ) : undefined
          }
        >
          {escapeUrl ? t('signin.inApp.message') : t('signin.inApp.manual')}
        </Banner>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {config.kakaoOidcEnabled && (
          <Button size="lg" fullWidth leadingIcon={<MessageCircle />} loading={kakao.busy} disabled={busy} onClick={() => kakao.run()} data-testid="signin-kakao">
            {t('signin.kakao')}
          </Button>
        )}
        {!inApp && (
          <Button
            size="lg"
            fullWidth
            variant={config.kakaoOidcEnabled ? 'secondary' : 'primary'}
            leadingIcon={<Globe />}
            loading={google.busy}
            disabled={busy}
            onClick={() => google.run()}
            data-testid="signin-google"
          >
            {t('signin.google')}
          </Button>
        )}
      </div>

      <div className="my-5 flex items-center gap-3 text-caption text-ink-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {t('signin.orEmail')}
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Input
          id="signin-email"
          label={t('signin.emailLabel')}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t('signin.emailPlaceholder')}
          leading={<Mail />}
          hint={t('signin.emailHint')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="signin-email"
        />
        <Button type="submit" size="lg" fullWidth variant="secondary" leadingIcon={<Send />} loading={emailLink.busy} loadingLabel={t('signin.sending')} disabled={busy} data-testid="signin-email-submit">
          {t('signin.emailSubmit')}
        </Button>
        {sentTo && (
          <Banner variant="success" data-testid="signin-email-sent">
            {t('signin.emailSent', { email: sentTo })}
          </Banner>
        )}
      </form>

      <p className="mt-auto pt-8 text-center text-caption text-ink-3">{t('signin.consent')}</p>
    </main>
  );
}
