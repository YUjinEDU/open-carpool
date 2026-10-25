import { subscribeTrips } from '../../data/trips';
import { CHURN_WINDOW_DAYS } from '../../domain/churn';
import { addDays } from '../../domain/dates';
import type { Trip } from '../../domain/types';
import { useSubscription, type Subscription } from '../../shared/lib/loadable';

export interface TripStats {
  /** Trips completed in the window. */
  readonly done: number;
  /** Trips that are over and were not cancelled: the denominator of the completion rate. */
  readonly counted: number;
}

/** Only trips that are over count: today's still-planned legs are not misses, cancelled ones never count. */
export function tripStats(trips: readonly Trip[], today: string): TripStats {
  const done = trips.filter((trip) => trip.status === 'done').length;
  const counted = trips.filter((trip) => trip.status !== 'cancelled' && (trip.status === 'done' || trip.date < today)).length;
  return { done, counted };
}

/** Live trips of the last two churn windows up to today, so the stats and churn follow a completion as it lands. */
export function useCrewHistory(gid: string, cid: string, today: string): Subscription<Trip[]> {
  const from = addDays(today, -2 * CHURN_WINDOW_DAYS);
  return useSubscription<Trip[]>(
    (onData, onError) => subscribeTrips({ gid, cid, range: { from, to: today } }, onData, onError),
    [gid, cid, from, today],
  );
}
