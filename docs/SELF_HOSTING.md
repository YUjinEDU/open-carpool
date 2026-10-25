# Self-hosting open-carpool

open-carpool is a static PWA (Vite + React) backed by Firebase Authentication and Cloud Firestore, plus two small serverless functions that proxy Naver geocoding for Korea. You can run it for your own organisation for free on the Firebase Spark plan and a Vercel hobby/pro account.

## 1. Requirements
- Node.js 20+ and npm
- Java 21+ (only for running the Firebase emulators locally / the security-rules tests)
- A Firebase project, a Vercel (or any static host + serverless) account
- Optional: NAVER Cloud Maps keys (Korea), Google Maps Platform key (other countries), Kakao Developers app (Kakao login)

## 2. Firebase project
1. Create a project at https://console.firebase.google.com and add a **Web app**. Copy its config (apiKey, authDomain, projectId, appId).
2. **Authentication > Sign-in method**: enable **Google** and **Email/Password > Email link (passwordless sign-in)**. Add your production domain under **Authorized domains**.
3. **Firestore Database**: create a database in a region close to your users (e.g. `asia-northeast3` Seoul). Choose production mode.
4. Deploy security rules and indexes from this repo:
   ```bash
   npx firebase login
   npx firebase use --add          # pick your project
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
5. Optional **Kakao login**: Kakao login uses OpenID Connect, which in Firebase requires upgrading to *Firebase Authentication with Identity Platform*. Create a Kakao Developers app, enable OpenID Connect, then add an OIDC provider with provider id `oidc.kakao`, issuer `https://kauth.kakao.com`, and the Kakao REST API key / client secret. Set `VITE_KAKAO_OIDC_ENABLED=true`.

## 3. Environment variables
Copy `.env.example` to `.env.local` (local) and set the same values in your host's environment settings (production):

| Variable | Required | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | yes | from the Firebase web app config |
| `VITE_NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | for Korean groups | NAVER Cloud Platform > Maps (Geocoding). The secret is only used by the serverless proxy in `api/naver/*` |
| `VITE_GOOGLE_MAPS_API_KEY` | for non-Korean groups | restrict it to your domain and the Maps JavaScript + Geocoding APIs |
| `ALLOWED_ORIGINS` | yes (production) | comma-separated exact origins allowed to call `/api/naver/*`, e.g. `https://carpool.example.org`. `localhost` dev origins are added only when `VERCEL_ENV` is not `production` |
| `FIREBASE_PROJECT_ID` | for `/api/naver/*` | project whose ID tokens the Naver proxy accepts (falls back to `VITE_FIREBASE_PROJECT_ID`). Without either the proxy answers 500 |
| `ALLOW_EMULATOR_ID_TOKENS` | no (dev only) | `true` lets the proxy accept unsigned Auth-emulator tokens, only together with `FIREBASE_AUTH_EMULATOR_HOST` and `VERCEL_ENV` other than `production` |
| `NAVER_RATE_LIMIT`, `NAVER_RATE_WINDOW_SEC` | no | per-user limit for `/api/naver/*`: requests per window (default `60`) per window seconds (default `300`). Over the limit the proxy answers `429` with `Retry-After` and makes no upstream call. The counter is **per-instance memory**: best effort on serverless (each warm instance counts separately, cold starts reset it). For a hard global limit, swap `SlidingWindowLimiter` in `api/naver/_ratelimit.ts` for a shared store such as Upstash Redis / Vercel KV |
| `VITE_APPCHECK_SITE_KEY` | no | reCAPTCHA Enterprise site key; enables Firebase App Check (see below). Ignored when `VITE_USE_FIREBASE_EMULATOR=true` |
| `VITE_KAKAO_OIDC_ENABLED` | no | `true` after step 2.5 |
| `VITE_KAKAO_JS_KEY` | no | Kakao share button |

Without map keys the app still works: members type an area name and no coordinates are stored.

### Optional: Firebase App Check (S-12)
App Check makes Firestore reject requests that do not come from your real web app.
1. Google Cloud console > reCAPTCHA Enterprise: create a **website** key for your production domain(s) and copy the site key.
2. Firebase console > App Check > Apps: register your web app, choose **reCAPTCHA Enterprise**, and paste the same site key.
3. Set `VITE_APPCHECK_SITE_KEY` to the site key and redeploy. The client then attaches App Check tokens to Firestore/Auth requests (the CSP in `vercel.json` already allows reCAPTCHA and `content-firebaseappcheck.googleapis.com`).
4. Watch Firebase console > App Check > APIs > Cloud Firestore metrics for a few days. Only when almost all traffic is verified, click **Enforce**; enforcing earlier locks out users on old cached builds.

## 4. Deploy to Vercel
1. Import the repository in Vercel. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
2. Add the environment variables from step 3.
3. `vercel.json` already rewrites all non-API routes to `index.html` so invite links like `/join/ABCD2345` work.
4. `vercel.json` also sends security headers on every route (checked by `api/_security-headers.test.ts`):

   | Header | Value |
   |---|---|
   | `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' https://apis.google.com https://www.gstatic.com https://maps.googleapis.com` (Firebase Auth popup helper, Google Maps JS); `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com` (Auth, Firestore, Maps; Naver goes through `/api`); `img-src 'self' data: blob: https:`; `style-src 'self' 'unsafe-inline'`; `font-src 'self'` (Pretendard is bundled from the npm package); `frame-src https://*.firebaseapp.com https://*.web.app https://accounts.google.com` (Auth iframe/popup); `worker-src 'self'`; `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` |
   | `X-Content-Type-Options` | `nosniff` |
   | `X-Frame-Options` | `DENY` |
   | `Referrer-Policy` | `strict-origin-when-cross-origin` |
   | `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` |

   If you use a **custom Auth domain** (not `*.firebaseapp.com` / `*.web.app`), add it to `frame-src`. If you add scripts or APIs, extend the policy; the browser console reports blocked requests as CSP violations. On other hosts, send the same headers from your server config.

Any other static host works too; you then need to host `api/naver/*.ts` as serverless functions (or skip Naver and use manual area names).

## 5. Run locally with emulators
```bash
npm install
npm run emulators            # Firebase Auth + Firestore emulators (needs Java)
# in another terminal
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```
Email sign-in links are not sent in emulator mode; read them from `http://127.0.0.1:9099/emulator/v1/projects/demo-open-carpool/oobCodes`.

## 6. Tests
```bash
npm run lint        # TypeScript
npm test            # unit tests (domain logic, data helpers, UI pieces)
npm run test:rules  # Firestore security rules against the emulator
```

## 7. Legal checklist before launch
- Adapt `docs/legal/*` (privacy policy, terms) to your organisation and jurisdiction.
- Korea: keep groups on the rotation-only cost policy (the app forces it for country `KR`); do not add payments. If you ever add live location sharing, file a 위치기반서비스사업 신고 first (위치정보법 제9조).
- The code is AGPL-3.0: if you modify it and run it as a network service, publish your modified source to your users.
