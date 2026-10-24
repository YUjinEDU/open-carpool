import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_auth';
import { checkOrigin } from './_cors';
import { proxyNaver } from './_naver';

const MAX_QUERY_LENGTH = 200;

/** A single address query of 1..200 characters. */
export function parseQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const query = value.trim();
  return query.length >= 1 && query.length <= MAX_QUERY_LENGTH ? query : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!checkOrigin(req, res)) return;
  if (!(await requireUser(req, res))) return;
  const query = parseQuery(req.query.query);
  if (query === null) {
    res.status(400).json({ error: `query must be 1..${MAX_QUERY_LENGTH} characters` });
    return;
  }
  await proxyNaver(res, '/map-geocode/v2/geocode', new URLSearchParams({ query }));
}
