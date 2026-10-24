import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_auth';
import { checkOrigin } from './_cors';
import { proxyNaver } from './_naver';

/** NAVER order: "lng,lat" (x,y), decimal degrees. */
const COORDS = /^(-?\d{1,3}(?:\.\d{1,10})?),(-?\d{1,2}(?:\.\d{1,10})?)$/;

export function parseCoords(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = COORDS.exec(value);
  if (!match) return null;
  const [, lng = '', lat = ''] = match;
  return Math.abs(Number(lng)) <= 180 && Math.abs(Number(lat)) <= 90 ? `${lng},${lat}` : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!checkOrigin(req, res)) return;
  if (!(await requireUser(req, res))) return;
  const coords = parseCoords(req.query.coords);
  if (coords === null) {
    res.status(400).json({ error: 'coords must be "lng,lat" in decimal degrees' });
    return;
  }
  // output and orders are fixed: clients cannot switch the response format the handler parses.
  await proxyNaver(res, '/map-reversegeocode/v2/gc', new URLSearchParams({ coords, output: 'json', orders: 'roadaddr,addr' }));
}
