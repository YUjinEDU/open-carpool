import { describe, expect, it } from 'vitest';
import { EMULATOR_PROJECT_ID, readConfig } from './config';

describe('readConfig', () => {
  it('defaults project id and api key when emulator mode has no project', () => {
    const cfg = readConfig({ VITE_USE_FIREBASE_EMULATOR: 'true' });
    expect(cfg.useFirebaseEmulator).toBe(true);
    expect(cfg.firebase.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(cfg.firebase.apiKey).toBe('demo-key');
  });

  it('keeps explicit values and leaves defaults off outside emulator mode', () => {
    const explicit = readConfig({ VITE_USE_FIREBASE_EMULATOR: 'true', VITE_FIREBASE_PROJECT_ID: 'demo-x', VITE_FIREBASE_API_KEY: 'k' });
    expect(explicit.firebase.projectId).toBe('demo-x');
    expect(explicit.firebase.apiKey).toBe('k');
    const prod = readConfig({ VITE_USE_FIREBASE_EMULATOR: 'false' });
    expect(prod.firebase.projectId).toBe('');
    expect(prod.firebase.apiKey).toBe('');
  });

  it('parses boolean flags only from "true"', () => {
    expect(readConfig({ VITE_KAKAO_OIDC_ENABLED: 'TRUE' }).kakaoOidcEnabled).toBe(true);
    expect(readConfig({ VITE_KAKAO_OIDC_ENABLED: '1' }).kakaoOidcEnabled).toBe(false);
  });
});
