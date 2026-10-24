import { upsertPlannedTrips } from '../../data/trips';
import { addDays } from '../../domain/dates';
import { planTrips, type PlanInput } from '../../domain/planning';
import type { Trip } from '../../domain/types';
import { tripsToWrite } from './reconcile';

/**
 * Trips the planner would write for `plan`, judged against `plan.existing`. Only an active crew is
 * planned: a paused or re-proposed crew keeps its trips as they are.
 */
export const plannedWrites = (plan: PlanInput): Trip[] =>
  plan.crew.status === 'active'
    ? tripsToWrite(planTrips(plan), plan.existing, { from: plan.from, to: addDays(plan.from, plan.days - 1) })
    : [];

export interface CrewPlanSync {
  readonly gid: string;
  /** Planner input; `existing` is the caller's snapshot, which may already be stale. */
  readonly plan: PlanInput;
}

/**
 * Write the crew's plan for the window. The snapshot only names which trips to look at: the plan is
 * recomputed inside the transaction from the stored trips, so concurrent edits are never lost.
 */
export async function syncCrewPlan({ gid, plan }: CrewPlanSync): Promise<void> {
  const ids = [...new Set([...plan.existing, ...planTrips(plan)].map((t) => t.id))];
  await upsertPlannedTrips(gid, plan.crew.id, {
    ids,
    writesFor: (stored) => plannedWrites({ ...plan, existing: stored }),
  });
}
