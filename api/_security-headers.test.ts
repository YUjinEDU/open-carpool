// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** S-05: vercel.json must send the security headers on every route (underscore: not a Vercel function). */
interface HeaderRule { readonly source: string; readonly headers: readonly { readonly key: string; readonly value: string }[] }
const config: { headers?: readonly HeaderRule[] } = JSON.parse(readFileSync('vercel.json', 'utf8'));
const all = config.headers?.find((h) => h.source === '/(.*)');
const header = (key: string) => all?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
const csp = () => new Map((header('Content-Security-Policy') ?? '').split(';').map((d) => {
  const [name = '', ...values] = d.trim().split(/\s+/);
  return [name, values] as const;
}));

describe('security headers', () => {
  it('sends the static hardening headers on every route', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Permissions-Policy')).toBe('geolocation=(self), camera=(), microphone=()');
  });

  it('forbids framing, plugins and inline scripts in the CSP', () => {
    const policy = csp();
    expect(policy.get('default-src')).toEqual(["'self'"]);
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('script-src')).toContain("'self'");
    expect(policy.get('script-src')).not.toContain("'unsafe-inline'");
    expect(policy.get('script-src')).not.toContain("'unsafe-eval'");
  });

  it('does not allow whole Google hosts as script or frame sources (JSONP CSP bypass)', () => {
    const policy = csp();
    for (const directive of ['script-src', 'frame-src']) {
      expect(policy.get(directive)).not.toContain('https://www.google.com');
      expect(policy.get(directive)).not.toContain('https://www.gstatic.com');
      expect(policy.get(directive)).not.toContain('https://www.recaptcha.net');
    }
  });

  it('serves fonts and styles from the app origin only (S-13: no font CDN in the chain)', () => {
    const policy = csp();
    expect(policy.get('font-src')).toEqual(["'self'"]);
    expect(policy.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it('allows the Firebase and Maps endpoints the app talks to', () => {
    const policy = csp();
    expect(policy.get('connect-src')).toEqual(expect.arrayContaining(["'self'", 'https://*.googleapis.com']));
    expect(policy.get('script-src')).toEqual(expect.arrayContaining(['https://apis.google.com', 'https://maps.googleapis.com']));
    expect(policy.get('frame-src')).toEqual(expect.arrayContaining(['https://*.firebaseapp.com']));
  });

  it('allows what reCAPTCHA Enterprise App Check loads', () => {
    const policy = csp();
    const recaptcha = ['https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/', 'https://www.recaptcha.net/recaptcha/'];
    expect(policy.get('script-src')).toEqual(expect.arrayContaining(recaptcha));
    expect(policy.get('frame-src')).toEqual(expect.arrayContaining(['https://www.google.com/recaptcha/', 'https://www.recaptcha.net/recaptcha/']));
    expect(policy.get('connect-src')).toEqual(expect.arrayContaining(['https://content-firebaseappcheck.googleapis.com']));
  });
});
