// @vitest-environment node
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import geocode from './geocode';
import { resetRateLimit } from './_ratelimit';
import reverseGeocode from './reverse-geocode';

/**
 * Handlers end to end with the emulator token path (unsigned tokens, explicitly enabled) so no
 * Google keys are needed; signature checks are covered in _auth.test.ts.
 */
const PROJECT = 'demo-carpool';
const ORIGIN = 'https://carpool.example.org';
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const TOKEN = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'u1', iat: now() - 5, exp: now() + 3600 })}.`;

interface Captured { status: number; body: unknown; headers: Record<string, string> }

function call(handler: (req: VercelRequest, res: VercelResponse) => unknown, query: Record<string, string | string[]>, headers: Record<string, string> = {}) {
  const captured: Captured = { status: 0, body: undefined, headers: {} };
  const res = {
    status(code: number) { captured.status = code; return res; },
    setHeader(name: string, value: string) { captured.headers[name] = value; return res; },
    json(body: unknown) { captured.body = body; return res; },
  };
  const req = { query, headers: { origin: ORIGIN, ...headers } };
  // The handlers only touch query/headers and status/json; the fakes above implement exactly that.
  return Promise.resolve(handler(req as unknown as VercelRequest, res as unknown as VercelResponse)).then(() => captured);
}
const authed = { authorization: `Bearer ${TOKEN}` };

const upstream = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('ALLOWED_ORIGINS', ORIGIN);
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('FIREBASE_PROJECT_ID', PROJECT);
  vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
  vi.stubEnv('ALLOW_EMULATOR_ID_TOKENS', 'true');
  resetRateLimit();
  upstream.mockReset();
  upstream.mockImplementation(async () => new Response(JSON.stringify({ addresses: [] }), { status: 200 }));
  vi.stubGlobal('fetch', upstream);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('auth gate', () => {
  it('rejects a request without a bearer token before calling Naver', async () => {
    expect((await call(geocode, { query: 'Daejeon' })).status).toBe(401);
    expect((await call(reverseGeocode, { coords: '127.3,36.3' })).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    expect((await call(geocode, { query: 'Daejeon' }, { authorization: 'Bearer abc.def.ghi' })).status).toBe(401);
  });

  it('rejects unsigned tokens in production even when the emulator flag is set', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await call(geocode, { query: 'Daejeon' }, authed)).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects a localhost origin in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await call(geocode, { query: 'Daejeon' }, { ...authed, origin: 'http://localhost:5173' })).status).toBe(403);
  });

  it('proxies an authenticated request', async () => {
    const r = await call(geocode, { query: 'Daejeon' }, authed);
    expect(r.status).toBe(200);
    expect(String(upstream.mock.calls[0]?.[0])).toContain('query=Daejeon');
  });
});

describe('rate limit', () => {
  it('answers 429 with Retry-After on call N+1 without calling Naver', async () => {
    vi.stubEnv('NAVER_RATE_LIMIT', '2');
    expect((await call(geocode, { query: 'Daejeon' }, authed)).status).toBe(200);
    expect((await call(reverseGeocode, { coords: '127.3,36.3' }, authed)).status).toBe(200);
    const r = await call(geocode, { query: 'Daejeon' }, authed);
    expect(r.status).toBe(429);
    expect(Number(r.headers['Retry-After'])).toBeGreaterThan(0);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
});

describe('parameter validation', () => {
  it('rejects an empty, repeated or oversized query', async () => {
    expect((await call(geocode, { query: '' }, authed)).status).toBe(400);
    expect((await call(geocode, { query: ['a', 'b'] }, authed)).status).toBe(400);
    expect((await call(geocode, { query: 'x'.repeat(201) }, authed)).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects malformed or out-of-range coords', async () => {
    for (const coords of ['abc', '127,37,1', '127;37', '500,37', '127,95', '']) {
      expect((await call(reverseGeocode, { coords }, authed)).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('forwards only fixed output and orders', async () => {
    await call(reverseGeocode, { coords: '127.3845,36.3504', output: 'xml', orders: 'legalcode' }, authed);
    const url = new URL(String(upstream.mock.calls[0]?.[0]));
    expect(url.searchParams.get('output')).toBe('json');
    expect(url.searchParams.get('orders')).toBe('roadaddr,addr');
    expect(url.searchParams.get('coords')).toBe('127.3845,36.3504');
  });
});

describe('error responses', () => {
  it('does not echo upstream error details', async () => {
    upstream.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:443 secret-detail'));
    const r = await call(geocode, { query: 'Daejeon' }, authed);
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).not.toContain('secret-detail');
  });

  it('does not echo a parse error from a non-JSON upstream body', async () => {
    upstream.mockResolvedValue(new Response('<xml>nope</xml>', { status: 200 }));
    const r = await call(reverseGeocode, { coords: '127.3,36.3' }, authed);
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).not.toContain('<');
  });
});
