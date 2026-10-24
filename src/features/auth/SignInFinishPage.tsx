import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, LinkIcon } from 'lucide-react';
import { assertNever } from '../../domain/assert';
import { describeError } from '../../shared/lib/useAction';
import { Button, EmptyState, Input, Spinner } from '../../shared/ui';
import { completeEmailLinkSignIn } from './authService';
import { safeNext } from './next';

type FinishState =
  | { readonly status: 'working' }
  | { readonly status: 'needs-email' }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed'; readonly message: string };

export function SignInFinishPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [state, setState] = useState<FinishState>({ status: 'working' });
  const [email, setEmail] = useState('');
  const started = useRef(false);

  const finish = async (address?: string) => {
    setState({ status: 'working' });
    try {
      const result = await completeEmailLinkSignIn(window.location.href, address);
      switch (result.status) {
        case 'signed-in':
          navigate(next, { replace: true });
          return;
        case 'needs-email':
          setState({ status: 'needs-email' });
          return;
        case 'not-a-sign-in-link':
          setState({ status: 'invalid' });
          return;
        default:
          assertNever(result);
      }
    } catch (e) {
      setState({ status: 'failed', message: describeError(e) });
    }
  };

  useEffect(() => {
    // The one-time link code must be consumed once, even if effects run twice.
    if (started.current) return;
    started.current = true;
    void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void finish(email.trim());
  };
  const retry = <Button onClick={() => navigate('/signin', { replace: true })}>{t('signinFinish.retry')}</Button>;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pb-safe pt-10">
      {state.status === 'working' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner size="lg" label={t('signinFinish.working')} className="text-accent" />
          <p className="text-body text-ink-2">{t('signinFinish.working')}</p>
        </div>
      )}
      {state.status === 'needs-email' && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <h1 className="text-title-2 text-ink">{t('signinFinish.title')}</h1>
          <p className="text-body text-ink-2">{t('signinFinish.needsEmail')}</p>
          <Input
            id="signin-finish-email"
            label={t('signin.emailLabel')}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="signin-finish-email"
          />
          <Button type="submit" size="lg" fullWidth data-testid="signin-finish-submit">
            {t('signinFinish.submit')}
          </Button>
        </form>
      )}
      {state.status === 'invalid' && (
        <EmptyState icon={<LinkIcon />} title={t('signinFinish.invalid')} description={t('signinFinish.invalidHint')} action={retry} />
      )}
      {state.status === 'failed' && (
        <EmptyState icon={<AlertCircle />} title={t('signinFinish.failedTitle')} description={state.message} action={retry} />
      )}
    </main>
  );
}
