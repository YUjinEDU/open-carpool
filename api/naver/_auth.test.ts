// @vitest-environment node
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthTokenError, verifyIdToken, type VerifierConfig } from './_auth';

const PROJECT = 'carpool-test';
const ISSUER = `https://securetoken.google.com/${PROJECT}`;
const now = () => Math.floor(Date.now() / 1000);

type Key = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let signingKey: Key;
let strangerKey: Key;
let config: VerifierConfig;

async function publicJwk(kid: string): Promise<{ jwk: JWK; privateKey: Key }> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  return { jwk: { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' }, privateKey };
}

beforeAll(async () => {
  const trusted = await publicJwk('trusted');
  const other = await publicJwk('trusted'); // same kid, different key: a forged signature
  signingKey = trusted.privateKey;
  strangerKey = other.privateKey;
  config = { projectId: PROJECT, keys: createLocalJWKSet({ keys: [trusted.jwk] }), allowEmulatorTokens: false };
});

interface TokenSpec {
  readonly key?: Key;
  readonly iss?: string;
  readonly aud?: string;
  readonly sub?: string;
  readonly iat?: number;
  readonly exp?: number;
}

function sign({ key = signingKey, iss = ISSUER, aud = PROJECT, sub = 'user-1', iat = now() - 10, exp = now() + 3600 }: TokenSpec = {}) {
  return new SignJWT({ auth_time: iat })
    .setProtectedHeader({ alg: 'RS256', kid: 'trusted' })
    .setIssuer(iss).setAudience(aud).setSubject(sub).setIssuedAt(iat).setExpirationTime(exp)
    .sign(key);
}

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const unsigned = (payload: Record<string, unknown>) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.`;
const emulatorPayload = (aud = PROJECT) => ({ iss: `https://securetoken.google.com/${aud}`, aud, sub: 'emu-user', iat: now() - 5, exp: now() + 3600 });

describe('verifyIdToken', () => {
  it('returns the uid of a valid Firebase ID token', async () => {
    expect(await verifyIdToken(await sign(), config)).toEqual({ uid: 'user-1' });
  });

  it('rejects a token for another project', async () => {
    await expect(verifyIdToken(await sign({ aud: 'other-project' }), config)).rejects.toBeInstanceOf(AuthTokenError);
    await expect(verifyIdToken(await sign({ iss: 'https://securetoken.google.com/other-project' }), config)).rejects.toBeInstanceOf(AuthTokenError);
  });

  it('rejects an expired token or one issued in the future', async () => {
    await expect(verifyIdToken(await sign({ iat: now() - 7200, exp: now() - 3600 }), config)).rejects.toBeInstanceOf(AuthTokenError);
    await expect(verifyIdToken(await sign({ iat: now() + 3600, exp: now() + 7200 }), config)).rejects.toBeInstanceOf(AuthTokenError);
  });

  it('rejects a token signed by an untrusted key', async () => {
    await expect(verifyIdToken(await sign({ key: strangerKey }), config)).rejects.toBeInstanceOf(AuthTokenError);
  });

  it('rejects a token without a subject', async () => {
    await expect(verifyIdToken(await sign({ sub: '' }), config)).rejects.toBeInstanceOf(AuthTokenError);
  });

  it('rejects garbage and unsigned tokens when emulator tokens are disabled', async () => {
    await expect(verifyIdToken('not-a-jwt', config)).rejects.toBeInstanceOf(AuthTokenError);
    await expect(verifyIdToken(unsigned(emulatorPayload()), config)).rejects.toBeInstanceOf(AuthTokenError);
  });

  it('accepts an unsigned emulator token only when explicitly enabled, still checking the project', async () => {
    const emulator = { ...config, allowEmulatorTokens: true };
    expect(await verifyIdToken(unsigned(emulatorPayload()), emulator)).toEqual({ uid: 'emu-user' });
    await expect(verifyIdToken(unsigned(emulatorPayload('other-project')), emulator)).rejects.toBeInstanceOf(AuthTokenError);
    await expect(verifyIdToken(unsigned({ ...emulatorPayload(), exp: now() - 1 }), emulator)).rejects.toBeInstanceOf(AuthTokenError);
  });
});
