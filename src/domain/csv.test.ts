import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

const columns = [{ key: 'name', header: '이름' }, { key: 'rides', header: 'Rides' }];

describe('toCsv', () => {
  it('writes a header and CRLF-terminated rows', () => {
    expect(toCsv([{ name: '홍길동', rides: 3 }], columns)).toBe('이름,Rides\r\n홍길동,3\r\n');
  });
  it('quotes commas, quotes and line breaks per RFC 4180', () => {
    const csv = toCsv([{ name: 'Kim, "J"\nLee', rides: null }], columns);
    expect(csv).toBe('이름,Rides\r\n"Kim, ""J""\nLee",\r\n');
  });
  it('renders null and missing values as empty cells', () => {
    expect(toCsv([{ name: null }], columns)).toBe('이름,Rides\r\n,\r\n');
  });
  it('prefixes a UTF-8 BOM on request', () => {
    expect(toCsv([], columns, { bom: true })).toBe('\uFEFF이름,Rides\r\n');
  });
  it('neutralises spreadsheet formulas in text but not negative numbers', () => {
    expect(toCsv([{ name: '=HYPERLINK("x")', rides: -1 }], columns)).toBe('이름,Rides\r\n"\'=HYPERLINK(""x"")",-1\r\n');
  });
});
