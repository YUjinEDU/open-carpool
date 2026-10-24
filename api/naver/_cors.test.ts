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
  it('always allows local dev servers', () => {
    expect(isAllowedOrigin('http://localhost:5173', allowedOrigins(undefined))).toBe(true);
  });
});
