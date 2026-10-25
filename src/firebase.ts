import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { shouldEnableAppCheck } from './shared/appCheck';
import { config } from './shared/config';

const app = initializeApp(config.firebase);

// Optional App Check; must be initialized before Firestore is used. No-op without a site key or on emulators.
if (shouldEnableAppCheck(config)) {
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}

export const auth = getAuth(app);
// Fall back to long polling where streaming WebChannel requests hang (proxies, WebViews, the HTTP/1.1
// emulator), so stalled channels do not use up the browser's per-host connection limit.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

if (config.useFirebaseEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
