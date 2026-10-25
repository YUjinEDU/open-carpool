import { detectChurn, type ChurnStatus } from '../../domain/churn';
import { toCsv, type CsvColumn, type CsvValue } from '../../domain/csv';
import { addDays } from '../../domain/dates';
import type { DateRange } from '../../data/trips';
import { scoreInRides } from '../../domain/rotation';
import { haversineKm } from '../../domain/suggest';
import type { Crew, Group, Leg, Member, Trip, TripStatus } from '../../domain/types';

export const STATS_WINDOW_DAYS = 30;
/** Straight-line distance times this factor approximates the road distance. ASSUMED. */
export const ROAD_FACTOR = 1.3;
/** Average passenger car emissions per km. ASSUMED. */
export const CO2_KG_PER_KM = 0.17;

export interface CrewTrips {
  readonly crew: Crew;
  readonly trips: readonly Trip[];
}

export interface Estimate {
  readonly distanceKm: number;
  readonly co2Kg: number;
}

export interface GroupStats {
  readonly activeMembers: number;
  readonly activeCrews: number;
  readonly tripsDone: number;
  /** Active members with at least one done trip / active members; null without members. */
  readonly participationRate: number | null;
  /** Riders / driver seats on done trips; null when no done trip had seats. */
  readonly seatsFilled: number | null;
  /** Null unless the group has a destination and some member set a home area. */
  readonly estimate: Estimate | null;
}

export interface CrewRow {
  readonly crew: Crew;
  readonly tripsDone: number;
  readonly churn: ChurnStatus;
  /** Highest minus lowest ledger balance, in rides. */
  readonly ledgerSpread: number;
}

export interface StatsInput {
  readonly group: Pick<Group, 'destination'>;
  readonly members: readonly Member[];
  readonly crews: readonly CrewTrips[];
  /** The period the numbers describe (the selected month); trips outside it are ignored. */
  readonly range: DateRange;
}

/** The churn comparison window: the last 30 days, which covers the two 14-day periods before today. */
export const statsRange = (today: string): DateRange => ({ from: addDays(today, -(STATS_WINDOW_DAYS - 1)), to: today });

const inRange = (trip: Trip, { from, to }: DateRange): boolean => trip.date >= from && trip.date <= to;

const doneIn = (trips: readonly Trip[], range: DateRange): Trip[] => trips.filter((t) => t.status === 'done' && inRange(t, range));

/** Each crew's trips narrowed to a period (the stats and the CSV of one month). */
export const tripsInRange = (crews: readonly CrewTrips[], range: DateRange): CrewTrips[] =>
  crews.map(({ crew, trips }) => ({ crew, trips: trips.filter((t) => inRange(t, range)) }));

/**
 * What the dashboard loads for a selected month: the month itself (stats, export) plus the churn window
 * before today. One range when they touch or overlap, otherwise two, in date order.
 */
export function dashboardRanges(month: string, today: string): DateRange[] {
  const selected = monthRange(month);
  const churn = statsRange(today);
  const [a, b] = selected.from <= churn.from ? [selected, churn] : [churn, selected];
  if (addDays(a.to, 1) < b.from) return [a, b];
  return [{ from: a.from, to: a.to > b.to ? a.to : b.to }];
}

export function groupStats({ group, members, crews, range }: StatsInput): GroupStats {
  const active = members.filter((m) => m.status === 'active');
  const byId = new Map(members.map((m) => [m.uid, m]));
  const done = crews.flatMap((c) => doneIn(c.trips, range));
  const travelled = new Set(done.flatMap((t) => [...(t.driverId ? [t.driverId] : []), ...t.riderIds]));
  const seats = done.reduce((sum, t) => sum + (t.driverId ? (byId.get(t.driverId)?.seats ?? 0) : 0), 0);
  const riders = done.reduce((sum, t) => sum + t.riderIds.length, 0);
  return {
    activeMembers: active.length,
    activeCrews: crews.filter((c) => c.crew.status === 'active').length,
    tripsDone: done.length,
    participationRate: active.length === 0 ? null : active.filter((m) => travelled.has(m.uid)).length / active.length,
    seatsFilled: seats === 0 ? null : riders / seats,
    estimate: estimateSavings(group, byId, done),
  };
}

function estimateSavings(group: Pick<Group, 'destination'>, byId: ReadonlyMap<string, Member>, done: readonly Trip[]): Estimate | null {
  const { destination } = group;
  if (destination === null || ![...byId.values()].some((m) => m.area !== null)) return null;
  const distanceKm = done
    .flatMap((t) => t.riderIds)
    .reduce((sum, uid) => {
      const area = byId.get(uid)?.area ?? null;
      return area === null ? sum : sum + haversineKm(area, destination) * ROAD_FACTOR;
    }, 0);
  return { distanceKm, co2Kg: distanceKm * CO2_KG_PER_KM };
}

/** Per-crew rows: trips done inside `range`; churn always compares the weeks before `today`. */
export function crewRows(crews: readonly CrewTrips[], today: string, range: DateRange): CrewRow[] {
  return crews.map(({ crew, trips }) => {
    const balances = crew.memberIds.map((uid) => scoreInRides(crew.scores[uid] ?? 0));
    return {
      crew,
      tripsDone: doneIn(trips, range).length,
      churn: detectChurn(trips, crew, today).status,
      ledgerSpread: balances.length === 0 ? 0 : Math.max(...balances) - Math.min(...balances),
    };
  });
}

/** 'YYYY-MM' -> first and last day of that month. */
export function monthRange(month: string): DateRange {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from: `${month}-01`, to: addDays(next, -1) };
}

/** "2026년 10월" / "October 2026" for a 'YYYY-MM' value; never the raw value. */
export const monthLabel = (month: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));

/** The current month first, then the n-1 months before it. */
export function recentMonths(today: string, n: number): string[] {
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const index = y * 12 + (m - 1) - i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
  });
}

export function csvFilename(groupName: string, month: string): string {
  const slug = groupName.trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '');
  return `open-carpool-${slug || 'group'}-${month}.csv`;
}

/** Words for the enum columns, in the reader's language: the file goes to an institution, not to a parser. */
export interface CsvLabels {
  readonly leg: Readonly<Record<Leg, string>>;
  readonly status: Readonly<Record<TripStatus, string>>;
}

export interface CsvInput {
  readonly crews: readonly CrewTrips[];
  readonly members: readonly Member[];
  readonly moneyEnabled: boolean;
  readonly labels: CsvLabels;
}

const BASE_COLUMNS: readonly CsvColumn[] = ['date', 'leg', 'crew', 'driver', 'riders', 'absent', 'status', 'completedBy', 'completedAt'].map((key) => ({ key, header: key }));
const COST_COLUMNS: readonly CsvColumn[] = ['cost', 'currency'].map((key) => ({ key, header: key }));
const LEG_ORDER = { out: 0, back: 1 } as const;

/** Every trip of every crew, sorted by date, leg and crew; member ids become display names, enums become words. */
export function tripsCsv({ crews, members, moneyEnabled, labels }: CsvInput): string {
  const names = new Map(members.map((m) => [m.uid, m.displayName]));
  const name = (uid: string | null): string => (uid === null ? '' : (names.get(uid) ?? uid));
  const rows = crews
    .flatMap(({ crew, trips }) => trips.map((trip) => ({ crew, trip })))
    .sort((p, q) => p.trip.date.localeCompare(q.trip.date) || LEG_ORDER[p.trip.leg] - LEG_ORDER[q.trip.leg] || p.crew.name.localeCompare(q.crew.name))
    .map(({ crew, trip }): Record<string, CsvValue> => ({
      date: trip.date,
      leg: labels.leg[trip.leg],
      crew: crew.name,
      driver: name(trip.driverId),
      riders: trip.riderIds.map(name).join('; '),
      absent: trip.absentIds.map(name).join('; '),
      status: labels.status[trip.status],
      completedBy: name(trip.completedBy),
      completedAt: trip.completedAt,
      cost: trip.cost?.totalAmount ?? null,
      currency: trip.cost?.currency ?? null,
    }));
  return toCsv(rows, moneyEnabled ? [...BASE_COLUMNS, ...COST_COLUMNS] : BASE_COLUMNS, { bom: true });
}
