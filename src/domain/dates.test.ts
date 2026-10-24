import { describe, expect, it } from 'vitest';
import { addDays, dayOfMonth, isoWeekday, nextNDays, today, zonedDateHour } from './dates';

describe('today', () => {
  it('uses the calendar date of the given time zone', () => {
    const now = new Date('2026-10-25T16:00:00Z');
    expect(today('Asia/Seoul', now)).toBe('2026-10-26');
    expect(today('UTC', now)).toBe('2026-10-25');
    expect(today('America/Los_Angeles', now)).toBe('2026-10-25');
  });
  it('defaults to Asia/Seoul', () => {
    expect(today(undefined, new Date('2026-10-25T15:00:00Z'))).toBe('2026-10-26');
  });
});

describe('zonedDateHour', () => {
  it('reports midnight as hour 0', () => {
    expect(zonedDateHour(new Date('2026-10-25T15:00:00Z'), 'Asia/Seoul')).toEqual({ date: '2026-10-26', hour: 0 });
  });
});

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('rejects malformed dates', () => {
    expect(() => addDays('2026/10/01', 1)).toThrow(RangeError);
  });
});

describe('isoWeekday', () => {
  it('maps Sunday to 7 and Monday to 1', () => {
    expect(isoWeekday('2026-10-25')).toBe(7);
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-10-30')).toBe(5);
  });
});

describe('nextNDays / dayOfMonth', () => {
  it('lists n consecutive dates starting at start', () => {
    expect(nextNDays('2026-10-30', 3)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(nextNDays('2026-10-30', 0)).toEqual([]);
  });
  it('reads the day of month', () => {
    expect(dayOfMonth('2026-10-31')).toBe(31);
  });
});
