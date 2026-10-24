import type { TripCost } from './types';

export class MoneyFeaturesDisabledError extends Error {
  constructor() {
    super('Money features are disabled for this group');
    this.name = 'MoneyFeaturesDisabledError';
  }
}

export interface CostSplitInput {
  readonly cost: TripCost;
  readonly driverId: string;
  readonly riderIds: readonly string[];
  /** Result of policies.moneyFeaturesEnabled(group). */
  readonly allowed: boolean;
}

export interface CostSplit {
  readonly currency: string;
  /** Per-person share in major units, driver included. Shares sum exactly to the total. */
  readonly shares: Readonly<Record<string, number>>;
  /** What each rider owes the driver. */
  readonly riderOwes: Readonly<Record<string, number>>;
}

function minorDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/**
 * Split an actual trip cost (fuel, tolls) equally among driver and riders, in the currency's minor
 * units. Leftover minor units go one each to the driver first, then riders in uid order.
 */
export function splitActualCost({ cost, driverId, riderIds, allowed }: CostSplitInput): CostSplit {
  if (!allowed) throw new MoneyFeaturesDisabledError();
  if (!Number.isFinite(cost.totalAmount) || cost.totalAmount < 0) {
    throw new RangeError(`totalAmount must be a finite non-negative number, got ${cost.totalAmount}`);
  }
  const scale = 10 ** minorDigits(cost.currency);
  const riders = [...new Set(riderIds)].filter((id) => id !== driverId).sort();
  const people = [driverId, ...riders];
  const totalMinor = Math.round(cost.totalAmount * scale);
  const base = Math.floor(totalMinor / people.length);
  const remainder = totalMinor - base * people.length;
  const shares = Object.fromEntries(people.map((id, i) => [id, (base + (i < remainder ? 1 : 0)) / scale]));
  const riderOwes = Object.fromEntries(riders.map((id) => [id, shares[id]]));
  return { currency: cost.currency, shares, riderOwes };
}
