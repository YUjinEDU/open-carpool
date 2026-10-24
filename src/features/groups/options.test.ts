import { describe, expect, it } from 'vitest';
import { parseEmailDomains } from './options';

describe('parseEmailDomains', () => {
  it('normalizes a comma or space separated list', () => {
    expect(parseEmailDomains(' @Example.com, corp.example.org\nexample.com ')).toEqual(['example.com', 'corp.example.org']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseEmailDomains('  ')).toEqual([]);
  });
});
