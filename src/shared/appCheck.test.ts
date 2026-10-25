import { describe, expect, it } from 'vitest';
import { shouldEnableAppCheck } from './appCheck';

describe('shouldEnableAppCheck', () => {
  it('is on when a site key is set and the emulator is off', () => {
    expect(shouldEnableAppCheck({ appCheckSiteKey: 'key', useFirebaseEmulator: false })).toBe(true);
  });

  it('is off without a site key', () => {
    expect(shouldEnableAppCheck({ appCheckSiteKey: '', useFirebaseEmulator: false })).toBe(false);
  });

  it('is off against the emulator even with a site key', () => {
    expect(shouldEnableAppCheck({ appCheckSiteKey: 'key', useFirebaseEmulator: true })).toBe(false);
  });
});
