import { describe, expect, it } from 'vitest';
import { detectLocale } from '.';
import enExt from './en.ext.json';
import en from './en.json';
import koExt from './ko.ext.json';
import ko from './ko.json';

const keysOf = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]: [string, unknown]) =>
    typeof value === 'object' && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

describe('translations', () => {
  it('ko and en define exactly the same keys', () => {
    expect(keysOf(ko).sort()).toEqual(keysOf(en).sort());
  });

  it('ko and en extension files define exactly the same keys', () => {
    expect(keysOf(koExt).sort()).toEqual(keysOf(enExt).sort());
  });

  it('extension files only add namespaces the base files do not have', () => {
    expect(Object.keys(koExt).filter((ns) => ns in ko)).toEqual([]);
    expect(Object.keys(enExt).filter((ns) => ns in en)).toEqual([]);
  });

  it('cover the keys emitted by the domain layer', () => {
    const keys = keysOf(en);
    for (const key of ['legal.kr.rotationOnly', 'legal.actualCost', 'legal.rotation', 'suggest.reason.nearby', 'suggest.reason.schedule', 'suggest.reason.drivers']) {
      expect(keys).toContain(key);
    }
  });
});

describe('detectLocale', () => {
  it('maps any Korean browser language to ko and everything else to en', () => {
    expect(detectLocale('ko-KR')).toBe('ko');
    expect(detectLocale('en-US')).toBe('en');
    expect(detectLocale('ja')).toBe('en');
  });
});
