import type { AppConfig } from './config';

/** App Check is opt-in: needs a reCAPTCHA Enterprise site key, and is skipped against the emulators. */
export function shouldEnableAppCheck(config: Pick<AppConfig, 'appCheckSiteKey' | 'useFirebaseEmulator'>): boolean {
  return config.appCheckSiteKey !== '' && !config.useFirebaseEmulator;
}
