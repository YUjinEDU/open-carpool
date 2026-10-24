import { describe, expect, it } from 'vitest';
import { safeNext } from './next';

describe('safeNext', () => {
  it('keeps same-origin paths such as an invite link', () => {
    expect(safeNext('/join/ABCD2345')).toBe('/join/ABCD2345');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example'])(
    'falls back to / when next is %s',
    (next) => {
      expect(safeNext(next)).toBe('/');
    },
  );
});
