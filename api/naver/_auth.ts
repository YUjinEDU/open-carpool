import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  errors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

/**
 * Firebase ID token verification without a service account: RS256 signatures checked against
 * Google's public securetoken JWKS, plus the issuer / audience / time claims Firebase documents.
 */
export const SECURETOKEN_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const CLOCK_TOLERANCE_S = 5;

export interface VerifierConfig {
  readonly projectId: string;
  readonly keys: JWTVerifyGetKey;
  /** Accept unsigned Auth-emulator tokens (alg "none"). Never true in production. */
  readonly allowEmulatorTokens: boolean;
}

export interface VerifiedUser {
  readonly uid: string;
}

export class AuthTokenError extends Error {
  constructor(readonly reason: string) {
    super(`invalid Firebase ID token: ${reason}`);
    this.name = 'AuthTokenError';
  }
}

const issuerFor = (projectId: string): string => `https://securetoken.google.com/${projectId}`;
const nowSeconds = (): number => Math.floor(Date.now() / 1000);

function userFromClaims(payload: JWTPayload): VerifiedUser {
  const latest = nowSeconds() + CLOCK_TOLERANCE_S;
  if (typeof payload.sub !== 'string' || payload.sub === '' || payload.sub.length > 128) throw new AuthTokenError('sub');
  if (typeof payload.iat !== 'number' || payload.iat > latest) throw new AuthTokenError('iat');
  if (typeof payload.auth_time === 'number' && payload.auth_time > latest) throw new AuthTokenError('auth_time');
  return { uid: payload.sub };
}

function headerAlg(token: string): string {
  try {
    return decodeProtectedHeader(token).alg ?? '';
  } catch (error) {
    if (error instanceof TypeError || error instanceof errors.JOSEError) throw new AuthTokenError('header');
    throw error;
  }
}

/** The Auth emulator signs nothing; still require this project's issuer/audience and a live exp. */
function verifyEmulatorToken(token: string, projectId: string): VerifiedUser {
  const payload = decodeJwt(token);
  if (payload.iss !== issuerFor(projectId) || payload.aud !== projectId) throw new AuthTokenError('project');
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds()) throw new AuthTokenError('exp');
  return userFromClaims(payload);
}

export async function verifyIdToken(token: string, config: VerifierConfig): Promise<VerifiedUser> {
  try {
    if (config.allowEmulatorTokens && headerAlg(token) === 'none') return verifyEmulatorToken(token, config.projectId);
    const { payload } = await jwtVerify(token, config.keys, {
      issuer: issuerFor(config.projectId),
      audience: config.projectId,
      algorithms: ['RS256'],
      clockTolerance: CLOCK_TOLERANCE_S,
      requiredClaims: ['exp', 'iat', 'sub'],
    });
    return userFromClaims(payload);
  } catch (error) {
    if (error instanceof errors.JOSEError) throw new AuthTokenError(error.code);
    throw error;
  }
}

let googleKeys: JWTVerifyGetKey | null = null;

/** Null when no project id is configured: the API then refuses every call. */
export function verifierConfigFromEnv(env: NodeJS.ProcessEnv = process.env): VerifierConfig | null {
  const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';
  if (!projectId) return null;
  googleKeys ??= createRemoteJWKSet(new URL(SECURETOKEN_JWKS_URL));
  return {
    projectId,
    keys: googleKeys,
    allowEmulatorTokens:
      env.VERCEL_ENV !== 'production' && Boolean(env.FIREBASE_AUTH_EMULATOR_HOST) && env.ALLOW_EMULATOR_ID_TOKENS === 'true',
  };
}

const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/;

/** Answer 401/500 and return null unless the request carries a valid Firebase ID token. */
export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<VerifiedUser | null> {
  const config = verifierConfigFromEnv();
  if (!config) {
    res.status(500).json({ error: 'Server misconfigured' });
    return null;
  }
  const header = req.headers.authorization;
  const token = typeof header === 'string' ? BEARER.exec(header)?.[1] : undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    return await verifyIdToken(token, config);
  } catch (error) {
    if (!(error instanceof AuthTokenError)) throw error;
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}
