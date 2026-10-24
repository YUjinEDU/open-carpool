import { describe, expect, it } from 'vitest';
import { defaultPolicyFor, effectiveCostMode, legalNoticeKey, moneyFeaturesEnabled, plateAllowed } from './policies';
import type { GroupPolicy } from './types';

const policy = (costMode: GroupPolicy['costMode']): GroupPolicy => ({ costMode, absenceCutoffHour: 21, plateRotation: 'none' });

describe('cost mode by country', () => {
  it('forces rotation for KR even when actual-cost is stored', () => {
    const group = { country: 'KR', policy: policy('actual-cost') };
    expect(effectiveCostMode(group)).toBe('rotation');
    expect(moneyFeaturesEnabled(group)).toBe(false);
    expect(effectiveCostMode({ country: 'kr', policy: policy('actual-cost') })).toBe('rotation');
  });
  it('honours the stored mode elsewhere', () => {
    expect(moneyFeaturesEnabled({ country: 'US', policy: policy('actual-cost') })).toBe(true);
    expect(moneyFeaturesEnabled({ country: 'US', policy: policy('rotation') })).toBe(false);
  });
});

describe('legalNoticeKey', () => {
  it('returns the KR rotation-only notice for KR', () => {
    expect(legalNoticeKey({ country: 'KR', policy: policy('actual-cost') })).toBe('legal.kr.rotationOnly');
  });
  it('returns the actual-cost or rotation notice elsewhere', () => {
    expect(legalNoticeKey({ country: 'JP', policy: policy('actual-cost') })).toBe('legal.actualCost');
    expect(legalNoticeKey({ country: 'JP', policy: policy('rotation') })).toBe('legal.rotation');
  });
});

describe('plateAllowed', () => {
  it("'none' allows every plate", () => {
    expect(plateAllowed('none', 3, '2026-10-26')).toBe(true);
  });
  it('odd-even matches plate parity to day-of-month parity, 0 counting as even', () => {
    expect(plateAllowed('odd-even', 7, '2026-10-31')).toBe(true);
    expect(plateAllowed('odd-even', 0, '2026-10-31')).toBe(false);
    expect(plateAllowed('odd-even', 0, '2026-10-30')).toBe(true);
    expect(plateAllowed('odd-even', 1, '2026-10-30')).toBe(false);
    // day 31 followed by day 1: two odd days in a row
    expect(plateAllowed('odd-even', 3, '2026-11-01')).toBe(true);
  });
  it('never restricts unknown plates', () => {
    expect(plateAllowed('odd-even', null, '2026-10-31')).toBe(true);
    expect(plateAllowed('five-day', null, '2026-10-26')).toBe(true);
  });
  it('five-day restricts the weekday digit pairs and frees weekends', () => {
    // 2026-10-26 is Monday .. 2026-11-01 Sunday
    const restricted: Record<string, number[]> = {
      '2026-10-26': [1, 6],
      '2026-10-27': [2, 7],
      '2026-10-28': [3, 8],
      '2026-10-29': [4, 9],
      '2026-10-30': [5, 0],
      '2026-10-31': [],
      '2026-11-01': [],
    };
    for (const [date, digits] of Object.entries(restricted)) {
      for (let d = 0; d <= 9; d++) expect(plateAllowed('five-day', d, date)).toBe(!digits.includes(d));
    }
  });
});

describe('defaultPolicyFor', () => {
  it('defaults to no-money rotation with no plate rule', () => {
    expect(defaultPolicyFor('KR')).toEqual({ costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' });
    expect(defaultPolicyFor('US').costMode).toBe('rotation');
  });
});
