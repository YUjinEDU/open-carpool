import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { assertNever } from '../../domain/assert';
import { describeError } from '../../shared/lib/useAction';
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

  return (
    <main className="p-4">
      <h1>{t('signinFinish.title')}</h1>
      {state.status === 'working' && <p role="status">{t('signinFinish.working')}</p>}
      {state.status === 'needs-email' && (
        <form onSubmit={onSubmit}>
          <p>{t('signinFinish.needsEmail')}</p>
          <label htmlFor="signin-finish-email">{t('signin.emailLabel')}</label>
          <input
            id="signin-finish-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="signin-finish-email"
          />
          <button type="submit" data-testid="signin-finish-submit">
            {t('signinFinish.submit')}
          </button>
        </form>
      )}
      {state.status === 'invalid' && <p role="alert">{t('signinFinish.invalid')}</p>}
      {state.status === 'failed' && <p role="alert">{state.message}</p>}
      {(state.status === 'invalid' || state.status === 'failed') && <Link to="/signin">{t('signinFinish.retry')}</Link>}
    </main>
  );
}
