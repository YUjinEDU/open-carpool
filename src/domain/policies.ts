import { assertNever } from './assert';
import { dayOfMonth, isoWeekday } from './dates';
import type { CostMode, CountryCode, Group, GroupPolicy, PlateRotation } from './types';

type PolicyHolder = Pick<Group, 'country' | 'policy'>;

const isKorea = (country: CountryCode): boolean => country.trim().toUpperCase() === 'KR';

/**
 * Korea: paid ride-sharing in private cars is restricted (여객자동차운수사업법 제81조), so KR groups
 * always run in no-money rotation mode whatever was stored.
 */
export function effectiveCostMode(group: PolicyHolder): CostMode {
  return isKorea(group.country) ? 'rotation' : group.policy.costMode;
}

export function moneyFeaturesEnabled(group: PolicyHolder): boolean {
  return effectiveCostMode(group) === 'actual-cost';
}

/**
 * Whether a car with this plate last digit may be driven on the date.
 * odd-even: odd day-of-month allows odd digits, even day allows even digits (0 is even).
 * five-day (5부제): Mon 1/6, Tue 2/7, Wed 3/8, Thu 4/9, Fri 5/0 are restricted; weekends free.
 * Unknown plates (null) are never restricted.
 */
export function plateAllowed(rotation: PlateRotation, plateLastDigit: number | null, date: string): boolean {
  if (plateLastDigit === null) return true;
  switch (rotation) {
    case 'none':
      return true;
    case 'odd-even':
      return plateLastDigit % 2 === dayOfMonth(date) % 2;
    case 'five-day': {
      const weekday = isoWeekday(date);
      return weekday > 5 || plateLastDigit % 5 !== weekday % 5;
    }
    default:
      return assertNever(rotation);
  }
}

/** i18n key of the legal/cost notice shown in group settings and trip screens. */
export function legalNoticeKey(group: PolicyHolder): string {
  if (isKorea(group.country)) return 'legal.kr.rotationOnly';
  return moneyFeaturesEnabled(group) ? 'legal.actualCost' : 'legal.rotation';
}

export function defaultPolicyFor(_country: CountryCode): GroupPolicy {
  return { costMode: 'rotation', absenceCutoffHour: 21, plateRotation: 'none' };
}
