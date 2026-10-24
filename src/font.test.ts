// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** S-13: Pretendard is self-hosted from the npm package; a CDN @import cannot carry SRI and is a supply-chain hole. */
describe('web font', () => {
  const css = readFileSync('src/index.css', 'utf8');

  it('imports the dynamic subset from the pretendard package, not a URL', () => {
    expect(css).toContain('@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";');
    expect(css).not.toMatch(/@import\s+url\(\s*["']?https?:/i);
    expect(css).not.toContain('cdn.jsdelivr.net');
  });

  it('keeps the font stack that the design contract names', () => {
    expect(css).toContain('"Pretendard Variable", Pretendard,');
  });
});
