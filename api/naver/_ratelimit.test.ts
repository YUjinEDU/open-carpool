// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { SlidingWindowLimiter, clientIp } from './_ratelimit';

const WINDOW_MS = 300_000;

function limiterAt(limit: number, maxKeys?: number) {
  const clock = { t: 1_000_000 };
  return { clock, limiter: new SlidingWindowLimiter({ limit, windowMs: WINDOW_MS }, () => clock.t, maxKeys) };
}

describe('SlidingWindowLimiter', () => {
  it('allows up to the limit and then blocks with a Retry-After', () => {
    const { clock, limiter } = limiterAt(3);
    for (let i = 0; i < 3; i += 1) expect(limiter.check('uid:a').allowed).toBe(true);
    clock.t += 10_000;
    expect(limiter.check('uid:a')).toEqual({ allowed: false, retryAfterSec: 290 });
  });

  it('allows again once the oldest request leaves the window', () => {
    const { clock, limiter } = limiterAt(2);
    limiter.check('uid:a');
    clock.t += 100_000;
    limiter.check('uid:a');
    expect(limiter.check('uid:a').allowed).toBe(false);
    clock.t += WINDOW_MS - 100_000;
    expect(limiter.check('uid:a').allowed).toBe(true);
    expect(limiter.check('uid:a').allowed).toBe(false);
  });

  it('counts each key separately', () => {
    const { limiter } = limiterAt(1);
    expect(limiter.check('uid:a').allowed).toBe(true);
    expect(limiter.check('uid:a').allowed).toBe(false);
    expect(limiter.check('uid:b').allowed).toBe(true);
    expect(limiter.check('ip:1.2.3.4').allowed).toBe(true);
  });

  it('does not count rejected requests against the window', () => {
    const { clock, limiter } = limiterAt(1);
    limiter.check('uid:a');
    for (let i = 0; i < 5; i += 1) limiter.check('uid:a');
    clock.t += WINDOW_MS;
    expect(limiter.check('uid:a').allowed).toBe(true);
  });

  it('sweeps expired keys at most once per window', () => {
    const { clock, limiter } = limiterAt(5, 100);
    limiter.check('uid:a'); // first check sweeps (nothing yet)
    clock.t += WINDOW_MS / 2;
    limiter.check('uid:b');
    clock.t += WINDOW_MS * 0.75; // a window since the last sweep: a (expired) goes, b (still counted) stays
    limiter.check('uid:c');
    expect(limiter.has('uid:a')).toBe(false);
    expect(limiter.size).toBe(2);
    clock.t += WINDOW_MS / 2; // b has expired but the next sweep is not due yet
    limiter.check('uid:d');
    expect(limiter.has('uid:b')).toBe(true);
    expect(limiter.size).toBe(3);
  });

  it('evicts the oldest keys once the map is over its cap', () => {
    const { clock, limiter } = limiterAt(5, 3);
    for (const key of ['uid:a', 'uid:b', 'uid:c', 'uid:d', 'uid:e']) {
      limiter.check(key);
      clock.t += 1;
    }
    expect(limiter.size).toBe(3);
    expect(limiter.has('uid:a')).toBe(false);
    expect(limiter.has('uid:e')).toBe(true);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) => ({ headers }) as unknown as VercelRequest;

  it('prefers the platform header and ignores a spoofed leftmost x-forwarded-for', () => {
    const real = req({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    const spoofed = req({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-forwarded-for': '7.7.7.7, 203.0.113.9' });
    expect(clientIp(real)).toBe('203.0.113.9');
    expect(clientIp(spoofed)).toBe('203.0.113.9');
  });

  it('falls back to the rightmost x-forwarded-for hop, which the proxy appended', () => {
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 198.51.100.4' }))).toBe('198.51.100.4');
  });
});
