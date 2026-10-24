import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Locale } from '../../domain/types';
import en from './en.json';
import ko from './ko.json';

export const resources = { ko: { translation: ko }, en: { translation: en } } as const;

export const LOCALES: readonly Locale[] = ['ko', 'en'];

export const detectLocale = (language: string): Locale => (language.toLowerCase().startsWith('ko') ? 'ko' : 'en');

/** Current UI locale (always one of LOCALES). */
export const currentLocale = (): Locale => detectLocale(i18n.language ?? 'en');

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(typeof navigator === 'undefined' ? 'en' : navigator.language),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

export default i18n;
