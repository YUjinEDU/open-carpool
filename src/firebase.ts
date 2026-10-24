import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { config } from './shared/config';

const app = initializeApp(config.firebase);

export const auth = getAuth(app);
// Fall back to long polling where streaming WebChannel requests hang (proxies, WebViews, the HTTP/1.1
// emulator), so stalled channels do not use up the browser's per-host connection limit.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

if (config.useFirebaseEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
