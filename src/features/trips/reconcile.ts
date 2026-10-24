import type { Trip } from '../../domain/types';

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

const samePlan = (a: Trip, b: Trip): boolean =>
  a.driverId === b.driverId && a.status === b.status && sameSet(a.riderIds, b.riderIds) && sameSet(a.absentIds, b.absentIds);

/** A driver gave up (or nobody could drive): stay open for a volunteer instead of re-assigning. */
const keepNeedsDriver = (planned: Trip): Trip => ({
  ...planned,
  driverId: null,
  status: 'needs_driver',
  riderIds: planned.driverId === null ? planned.riderIds : [...planned.riderIds, planned.driverId],
});

/** Dates the plan covers, 'YYYY-MM-DD' inclusive. */
export interface PlanWindow {
  readonly from: string;
  readonly to: string;
}

const isOpen = (t: Trip): boolean => !t.applied && (t.status === 'planned' || t.status === 'needs_driver');

/**
 * Trips that must be written: new ones, open (or cancelled) ones whose plan changed, and open trips in
 * the window that the plan no longer contains (a removed weekday or leg), which are cancelled. Done and
 * applied trips are never rewritten; needs_driver trips keep waiting for a volunteer.
 */
export function tripsToWrite(planned: readonly Trip[], existing: readonly Trip[], window: PlanWindow): Trip[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  const plannedIds = new Set(planned.map((p) => p.id));
  const writes = planned.flatMap((p) => {
    const prev = byId.get(p.id);
    if (!prev) return [p];
    if (prev.applied || prev.status === 'done') return [];
    const next = prev.status === 'needs_driver' ? keepNeedsDriver(p) : p;
    return samePlan(prev, next) ? [] : [next];
  });
  const dropped = existing
    .filter((t) => !plannedIds.has(t.id) && isOpen(t) && t.date >= window.from && t.date <= window.to)
    .map((t): Trip => ({ ...t, status: 'cancelled' }));
  return [...writes, ...dropped];
}
