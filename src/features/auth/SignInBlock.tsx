import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ExternalLink, Globe, Mail, MessageCircle, Send } from 'lucide-react';
import { detectInAppBrowser, detectPlatform, externalOpenUrl } from '../../domain/inapp';
import { config } from '../../shared/config';
import { useAction } from '../../shared/lib/useAction';
import { Banner, Button, Input } from '../../shared/ui';
import { sendEmailSignInLink, signInWithGoogle, signInWithKakao, type SignInResult } from './authService';

export interface SignInBlockProps {
  /** Same-origin path to continue to after sign-in (already passed through safeNext). */
  readonly next: string;
}

/**
 * Providers + email link, shared by the Sign-in page and the invite landing. Inside an in-app browser
 * (KakaoTalk, LINE, ...) Google is unavailable, so "open in your browser" becomes the primary action.
 */
export function SignInBlock({ next }: SignInBlockProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const userAgent = navigator.userAgent;
  const inApp = detectInAppBrowser(userAgent);
  const escapeUrl = externalOpenUrl(inApp, window.location.href, detectPlatform(userAgent));

  const afterProvider = (result: SignInResult) => {
    if (result.status === 'signed-in') navigate(next, { replace: true });
  };
  const google = useAction(async () => afterProvider(await signInWithGoogle()), { report: 'inline' });
  const kakao = useAction(async () => afterProvider(await signInWithKakao()), { report: 'inline' });
  const emailLink = useAction(async (address: string) => {
    const finishUrl = `${window.location.origin}/signin/finish?next=${encodeURIComponent(next)}`;
    await sendEmailSignInLink(address, finishUrl);
    setSentTo(address);
  }, { report: 'inline' });

  const busy = google.busy || kakao.busy || emailLink.busy;
  const providerError = google.error ?? kakao.error;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    emailLink.run(email.trim());
  };

  return (
    <div className="flex flex-col">
      {inApp && (
        <Banner variant="warn" className="mb-4" title={t('signin.inApp.title', { app: t(`signin.inApp.app.${inApp}`) })} data-testid="inapp-banner">
          {escapeUrl ? t('signin.inApp.message') : t('signin.inApp.manual')}
        </Banner>
      )}

      <div className="flex flex-col gap-2">
        {inApp && escapeUrl && (
          <Button
            size="lg"
            fullWidth
            leadingIcon={<ExternalLink />}
            onClick={() => {
              window.location.href = escapeUrl;
            }}
            data-testid="inapp-open-external"
          >
            {t('signin.inApp.open')}
          </Button>
        )}
        {config.kakaoOidcEnabled && (
          <Button
            size="lg"
            fullWidth
            variant={inApp && escapeUrl ? 'secondary' : 'primary'}
            leadingIcon={<MessageCircle />}
            loading={kakao.busy}
            disabled={busy}
            onClick={() => kakao.run()}
            data-testid="signin-kakao"
          >
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
        {providerError && <Banner variant="danger">{providerError}</Banner>}
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
          error={emailLink.error ?? undefined}
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
    </div>
  );
}
