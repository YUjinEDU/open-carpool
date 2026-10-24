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
| `ALLOWED_ORIGINS` | yes (production) | comma-separated exact origins allowed to call `/api/naver/*`, e.g. `https://carpool.example.org` |
| `VITE_KAKAO_OIDC_ENABLED` | no | `true` after step 2.5 |
| `VITE_KAKAO_JS_KEY` | no | Kakao share button |

Without map keys the app still works: members type an area name and no coordinates are stored.

## 4. Deploy to Vercel
1. Import the repository in Vercel. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
2. Add the environment variables from step 3.
3. `vercel.json` already rewrites all non-API routes to `index.html` so invite links like `/join/ABCD2345` work.

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
