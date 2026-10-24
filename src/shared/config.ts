/** Typed runtime configuration. Everything comes from Vite env (`VITE_*`); see .env.example. */

export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

export interface AppConfig {
  readonly firebase: FirebaseWebConfig;
  readonly useFirebaseEmulator: boolean;
  readonly kakaoOidcEnabled: boolean;
  readonly naverClientId: string;
  readonly googleMapsApiKey: string;
  readonly kakaoJsKey: string;
}

export const EMULATOR_PROJECT_ID = 'demo-open-carpool';
const EMULATOR_API_KEY = 'demo-key';

type RawEnv = Readonly<Record<string, string | boolean | undefined>>;

const text = (env: RawEnv, key: string): string => {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const flag = (env: RawEnv, key: string): boolean => {
  const value = env[key];
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
};

export function readConfig(env: RawEnv): AppConfig {
  const useFirebaseEmulator = flag(env, 'VITE_USE_FIREBASE_EMULATOR');
  const projectId = text(env, 'VITE_FIREBASE_PROJECT_ID');
  const apiKey = text(env, 'VITE_FIREBASE_API_KEY');
  return {
    firebase: {
      apiKey: apiKey || (useFirebaseEmulator ? EMULATOR_API_KEY : ''),
      authDomain: text(env, 'VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: projectId || (useFirebaseEmulator ? EMULATOR_PROJECT_ID : ''),
      appId: text(env, 'VITE_FIREBASE_APP_ID'),
    },
    useFirebaseEmulator,
    kakaoOidcEnabled: flag(env, 'VITE_KAKAO_OIDC_ENABLED'),
    naverClientId: text(env, 'VITE_NAVER_CLIENT_ID'),
    googleMapsApiKey: text(env, 'VITE_GOOGLE_MAPS_API_KEY'),
    kakaoJsKey: text(env, 'VITE_KAKAO_JS_KEY'),
  };
}

export const config: AppConfig = readConfig(import.meta.env);
