import type { Scores } from './types';

/**
 * Fagin & Williams fair carpool scheduling (IBM J. R&D 27(2), 1983).
 *
 * On a trip with k participants (driver included) the driver earns U*(k-1)/k and every rider
 * pays U/k. With U = 60 every k in 1..6 gives integer units, so scores never drift from rounding.
 * Absent members are untouched, so missing a day costs nothing. The sum of all scores stays 0.
 */
export const UNIT = 60;

export function shareUnits(participants: number): number {
  if (!Number.isInteger(participants) || participants < 1 || participants > 6) {
    throw new RangeError(`participants must be an integer in 1..6, got ${participants}`);
  }
  return UNIT / participants;
}

/** Return new scores after a completed trip. Riders must not include the driver. */
export function applyTrip(scores: Scores, driverId: string, riderIds: string[]): Scores {
  const riders = [...new Set(riderIds)].filter((id) => id !== driverId);
  const k = riders.length + 1;
  const share = shareUnits(k);
  const next: Scores = { ...scores };
  next[driverId] = (next[driverId] ?? 0) + share * (k - 1);
  for (const r of riders) next[r] = (next[r] ?? 0) - share;
  return next;
}

export interface PickDriverInput {
  present: string[];       // members taking part in the trip
  eligible: string[];      // members allowed to drive that day (canDrive, plate rule, ...)
  scores: Scores;
  lastDroveOn?: Record<string, string>; // uid -> 'YYYY-MM-DD'; older date wins ties
}

/**
 * Lowest score among present & eligible members drives. Ties: the one who drove longest ago
 * (never drove first), then uid for determinism. Returns null when nobody present may drive.
 */
export function pickDriver({ present, eligible, scores, lastDroveOn = {} }: PickDriverInput): string | null {
  const allowed = new Set(eligible);
  const candidates = [...new Set(present)].filter((id) => allowed.has(id));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const sa = scores[a] ?? 0;
    const sb = scores[b] ?? 0;
    if (sa !== sb) return sa - sb;
    const la = lastDroveOn[a] ?? '';
    const lb = lastDroveOn[b] ?? '';
    if (la !== lb) return la < lb ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return candidates[0];
}

/** Score in "rides": positive = drove more than fair share. */
export function scoreInRides(units: number): number {
  return units / UNIT;
}
