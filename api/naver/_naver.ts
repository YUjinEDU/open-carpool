import type { VercelResponse } from '@vercel/node';

const UPSTREAM = 'https://maps.apigw.ntruss.com';
const TIMEOUT_MS = 8000;

/** Call NAVER Cloud Maps with the server-side key; failures answer 502 without upstream details. */
export async function proxyNaver(res: VercelResponse, path: string, params: URLSearchParams): Promise<void> {
  const headers = {
    'X-NCP-APIGW-API-KEY-ID': process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID || '',
    'X-NCP-APIGW-API-KEY': process.env.NAVER_CLIENT_SECRET || '',
  };
  let response: Response;
  try {
    response = await fetch(`${UPSTREAM}${path}?${params}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    res.status(502).json({ error: 'Upstream unavailable' });
    return;
  }
  if (!response.ok) {
    res.status(502).json({ error: 'Upstream error' });
    return;
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    res.status(502).json({ error: 'Upstream error' });
    return;
  }
  res.status(200).json(data);
}
