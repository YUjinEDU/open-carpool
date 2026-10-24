import { describe, expect, it } from 'vitest';
import { allowedOrigins, isAllowedOrigin } from './_cors';

describe('isAllowedOrigin', () => {
  const list = allowedOrigins('https://carpool.example.org');
  it('allows an exact configured origin and its referer URLs', () => {
    expect(isAllowedOrigin('https://carpool.example.org', list)).toBe(true);
    expect(isAllowedOrigin('https://carpool.example.org/groups/1', list)).toBe(true);
  });
  it('rejects look-alike hosts that only share a prefix', () => {
    expect(isAllowedOrigin('https://carpool.example.org.evil.test', list)).toBe(false);
    expect(isAllowedOrigin('https://carpool.example.organization', list)).toBe(false);
  });
  it('rejects garbage and empty values', () => {
    expect(isAllowedOrigin('', list)).toBe(false);
    expect(isAllowedOrigin('not a url', list)).toBe(false);
  });
  it('allows local dev servers outside production', () => {
    expect(isAllowedOrigin('http://localhost:5173', allowedOrigins(undefined, 'development'))).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', allowedOrigins(undefined, undefined))).toBe(true);
  });
  it('rejects local dev servers in production', () => {
    expect(isAllowedOrigin('http://localhost:5173', allowedOrigins('https://carpool.example.org', 'production'))).toBe(false);
    expect(isAllowedOrigin('http://localhost:4173', allowedOrigins(undefined, 'production'))).toBe(false);
  });
});
