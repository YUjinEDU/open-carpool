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

/**
 * Planned trips that must be written: new ones and open ones whose plan changed. Done, cancelled
 * and applied trips are never rewritten; needs_driver trips keep waiting for a volunteer.
 */
export function tripsToWrite(planned: readonly Trip[], existing: readonly Trip[]): Trip[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  return planned.flatMap((p) => {
    const prev = byId.get(p.id);
    if (!prev) return [p];
    if (prev.applied || prev.status === 'done' || prev.status === 'cancelled') return [];
    const next = prev.status === 'needs_driver' ? keepNeedsDriver(p) : p;
    return samePlan(prev, next) ? [] : [next];
  });
}
