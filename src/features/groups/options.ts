import type { CostMode, CountryCode, GroupType, PlateRotation } from '../../domain/types';

export const GROUP_TYPES: readonly GroupType[] = ['company', 'university', 'school', 'club', 'church', 'other'];
export const COST_MODES: readonly CostMode[] = ['rotation', 'actual-cost'];
export const PLATE_ROTATIONS: readonly PlateRotation[] = ['none', 'odd-even', 'five-day'];

/** Countries offered in group forms; names come from Intl.DisplayNames in the UI locale. */
export const COUNTRIES: readonly CountryCode[] = ['KR', 'JP', 'TW', 'SG', 'US', 'CA', 'GB', 'DE', 'FR', 'AU'];

export function countryName(code: CountryCode, locale: string): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
}

/** "a.com, b.org" -> ['a.com', 'b.org'] (lower-case, no '@', no blanks or duplicates). */
export function parseEmailDomains(text: string): string[] {
  const domains = text
    .split(/[\s,]+/)
    .map((d) => d.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);
  return [...new Set(domains)];
}
