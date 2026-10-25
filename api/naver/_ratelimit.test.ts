// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SlidingWindowLimiter } from './_ratelimit';

const WINDOW_MS = 300_000;

function limiterAt(limit: number) {
  const clock = { t: 1_000_000 };
  return { clock, limiter: new SlidingWindowLimiter({ limit, windowMs: WINDOW_MS }, () => clock.t) };
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
});
