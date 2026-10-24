import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../../app/providers/auth';
import { useSession } from '../../app/providers/session';
import { showToast } from '../../components/Toast';
import type { Locale } from '../../domain/types';
import { LOCALES } from '../../shared/i18n';
import { useAction } from '../../shared/lib/useAction';
import { signOut } from '../auth/authService';

const isLocale = (v: string): v is Locale => LOCALES.some((l) => l === v);

/** Account settings shared by every group. */
export function MePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { saveProfile } = useAuth();
  const { profile } = useSession();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [locale, setLocale] = useState<Locale>(profile.locale);

  const save = useAction(async () => {
    await saveProfile({ ...profile, displayName: displayName.trim(), locale });
    showToast(t('common.saved'), 'success');
  });
  const leave = useAction(async () => {
    await signOut();
    navigate('/signin', { replace: true });
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.run();
  };

  return (
    <main className="p-4">
      <h1>{t('me.title')}</h1>
      <p data-testid="me-email">{profile.email}</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="me-display-name">{t('me.displayName')}</label>
        <input
          id="me-display-name"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          data-testid="me-display-name"
        />
        <label htmlFor="me-locale">{t('me.locale')}</label>
        <select
          id="me-locale"
          value={locale}
          onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
          data-testid="me-locale"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {t(`locale.${l}`)}
            </option>
          ))}
        </select>
        <button type="submit" disabled={save.busy} data-testid="me-save">
          {t('common.save')}
        </button>
      </form>
      <button type="button" onClick={() => leave.run()} disabled={leave.busy} data-testid="signout">
        {t('me.signOut')}
      </button>
    </main>
  );
}
