import { addDays } from './dates';
import type { Crew, Trip } from './types';

export type ChurnStatus = 'ok' | 'declining' | 'stalled';

export interface ChurnReport {
  readonly status: ChurnStatus;
  /** done / non-cancelled trips in the last 14 days (0 when there were none). */
  readonly recentRate: number;
  readonly previousRate: number;
  /** Crew members absent from at least 60% of the last 14 days' trips. */
  readonly membersAtRisk: readonly string[];
}

export const CHURN_WINDOW_DAYS = 14;
export const DECLINE_RATIO = 0.6;
export const ABSENCE_RISK_RATIO = 0.6;

const doneRate = (trips: readonly Trip[]): number =>
  trips.length === 0 ? 0 : trips.filter((t) => t.status === 'done').length / trips.length;

/**
 * Compare the last 14 full days (before today) with the 14 days before that.
 * Cancelled trips (holidays, manual cancels) are ignored.
 */
export function detectChurn(trips: readonly Trip[], crew: Pick<Crew, 'memberIds'>, today: string): ChurnReport {
  const recentStart = addDays(today, -CHURN_WINDOW_DAYS);
  const previousStart = addDays(today, -2 * CHURN_WINDOW_DAYS);
  const counted = trips.filter((t) => t.status !== 'cancelled');
  const recent = counted.filter((t) => t.date >= recentStart && t.date < today);
  const previous = counted.filter((t) => t.date >= previousStart && t.date < recentStart);
  const recentRate = doneRate(recent);
  const previousRate = doneRate(previous);
  const recentDone = recent.some((t) => t.status === 'done');
  const previousDone = previous.some((t) => t.status === 'done');
  const status: ChurnStatus =
    !recentDone && previousDone ? 'stalled' : previousRate > 0 && recentRate < DECLINE_RATIO * previousRate ? 'declining' : 'ok';
  const membersAtRisk = recent.length === 0
    ? []
    : crew.memberIds.filter((uid) => recent.filter((t) => t.absentIds.includes(uid)).length / recent.length >= ABSENCE_RISK_RATIO);
  return { status, recentRate, previousRate, membersAtRisk };
}
