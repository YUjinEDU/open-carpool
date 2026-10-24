import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { detectLocale, setLocale } from '../../shared/i18n';
import { useAuth } from './auth';

/** UI language: the signed-in user's profile locale, else the browser language. */
export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const locale = useAuth().profile?.locale;
  useEffect(() => {
    setLocale(locale ?? detectLocale(navigator.language));
  }, [locale]);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
