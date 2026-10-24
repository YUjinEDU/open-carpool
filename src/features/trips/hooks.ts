import { useEffect, useMemo, useRef } from 'react';
import { useGroup } from '../../app/providers/group';
import { showToast } from '../../components/Toast';
import { subscribeTrips, type DateRange } from '../../data/trips';
import { addDays, DEFAULT_TZ, today } from '../../domain/dates';
import type { PlanInput } from '../../domain/planning';
import type { Crew, Member, Trip } from '../../domain/types';
import { useSubscription, type Loadable } from '../../shared/lib/loadable';
import { describeError } from '../../shared/lib/useAction';
import { plannedWrites, syncCrewPlan } from './syncPlan';

/** Groups carry no time zone yet; every date and cutoff is evaluated in this zone. */
export const GROUP_TZ = DEFAULT_TZ;
export const PLAN_DAYS = 7;
const PLAN_DEBOUNCE_MS = 400;

export const useTrips = (gid: string, cid: string, range: DateRange) =>
  useSubscription<Trip[]>(
    (onData, onError) => subscribeTrips({ gid, cid, range }, onData, onError),
    [gid, cid, range.from, range.to],
  );

/**
 * Live trips of the next PLAN_DAYS days. While a crew member watches, the plan is recomputed
 * (debounced) and only trips whose plan changed are written; settled trips are never touched.
 */
export function useCrewPlan(crew: Crew, members: readonly Member[]): Loadable<Trip[]> {
  const { group, me } = useGroup();
  const from = today(GROUP_TZ);
  const range = useMemo(() => ({ from, to: addDays(from, PLAN_DAYS - 1) }), [from]);
  const trips = useTrips(group.id, crew.id, range);
  const lastWrite = useRef('');
  const isMember = crew.memberIds.includes(me.uid);

  useEffect(() => {
    if (trips.status !== 'ready' || !isMember) return undefined;
    const timer = window.setTimeout(() => {
      const plan: PlanInput = {
        crew,
        members,
        from,
        days: PLAN_DAYS,
        existing: trips.data,
        now: new Date(),
        tz: GROUP_TZ,
        policy: group.policy,
      };
      const writes = plannedWrites(plan);
      const key = JSON.stringify(writes);
      if (writes.length === 0 || key === lastWrite.current) return;
      lastWrite.current = key;
      syncCrewPlan({ gid: group.id, plan }).catch((e: unknown) => {
        lastWrite.current = '';
        showToast(describeError(e), 'error');
      });
    }, PLAN_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trips, crew, members, from, group, isMember]);

  return trips;
}
