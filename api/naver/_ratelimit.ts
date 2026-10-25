import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Per-user sliding-window rate limit for the Naver proxy (`enforceRateLimit`, called after auth).
 *
 * The store is a plain in-memory Map inside the function instance. On serverless that makes this
 * BEST EFFORT: every warm instance counts separately and a cold start forgets everything, so the
 * real ceiling is roughly limit x concurrent instances. It still stops one account hammering a
 * warm instance. For a hard, global limit, replace `SlidingWindowLimiter` with a shared store
 * (Upstash Redis / Vercel KV): keep `check(key)` and make it async, e.g. an INCR + EXPIRE or a
 * sorted-set window keyed by `key`; the callers only need `{ allowed, retryAfterSec }`.
 *
 * Env: NAVER_RATE_LIMIT (requests per window, default 60), NAVER_RATE_WINDOW_SEC (default 300).
 */
export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Whole seconds until the oldest counted request leaves the window; 0 when allowed. */
  readonly retryAfterSec: number;
}

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_SEC = 300;
const SWEEP_ABOVE_KEYS = 5000;

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    readonly config: RateLimitConfig,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitDecision {
    const t = this.now();
    const cutoff = t - this.config.windowMs;
    if (this.hits.size > SWEEP_ABOVE_KEYS) this.sweep(cutoff);
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);
    const oldest = recent[0];
    if (oldest !== undefined && recent.length >= this.config.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + this.config.windowMs - t) / 1000)) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterSec: 0 };
  }

  private sweep(cutoff: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((at) => at <= cutoff)) this.hits.delete(key);
    }
  }
}

const positiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function rateLimitConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  return {
    limit: positiveInt(env.NAVER_RATE_LIMIT, DEFAULT_LIMIT),
    windowMs: positiveInt(env.NAVER_RATE_WINDOW_SEC, DEFAULT_WINDOW_SEC) * 1000,
  };
}

let shared: SlidingWindowLimiter | null = null;

/** Drop all counters (tests). */
export function resetRateLimit(): void {
  shared = null;
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || 'unknown';
}

/** Count this request; answer 429 + Retry-After and return false once the caller is over the limit. */
export function enforceRateLimit(req: VercelRequest, res: VercelResponse, uid?: string): boolean {
  const config = rateLimitConfigFromEnv();
  if (shared?.config.limit !== config.limit || shared.config.windowMs !== config.windowMs) {
    shared = new SlidingWindowLimiter(config);
  }
  const decision = shared.check(uid ? `uid:${uid}` : `ip:${clientIp(req)}`);
  if (decision.allowed) return true;
  res.setHeader('Retry-After', String(decision.retryAfterSec));
  res.status(429).json({ error: 'Too many requests' });
  return false;
}
