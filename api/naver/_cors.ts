import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Exact-match origin allowlist. Configure with ALLOWED_ORIGINS (comma-separated),
 * e.g. "https://carpool.example.org,https://preview.example.org".
 * Local dev origins are always allowed.
 */
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

export function allowedOrigins(env: string | undefined = process.env.ALLOWED_ORIGINS): string[] {
  const configured = (env ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...configured, ...DEV_ORIGINS];
}

function originOf(value: string): string {
  try { return new URL(value).origin; } catch { return ''; }
}

export function isAllowedOrigin(originHeader: string, allowList: string[]): boolean {
  const origin = originOf(originHeader);
  return origin !== '' && allowList.includes(origin);
}

export function checkOrigin(req: VercelRequest, res: VercelResponse): boolean {
  const header = (req.headers.origin as string | undefined) || (req.headers.referer as string | undefined) || '';
  if (!header) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  if (!isAllowedOrigin(header, allowedOrigins())) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}
