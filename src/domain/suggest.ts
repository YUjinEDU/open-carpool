import type { DaySchedule, LatLng, Member, Weekday, WeeklySchedule } from './types';
import { MAX_CREW_SIZE } from './types';

export interface SuggestOptions {
  readonly maxSize?: number;
  readonly maxDistanceKm?: number;
}

export interface SuggestionReason {
  readonly key: string; // i18n key
  readonly params: Readonly<Record<string, number>>;
}

export interface CrewSuggestion {
  readonly memberIds: readonly string[];
  readonly score: number;
  readonly reasons: readonly SuggestionReason[];
}

export interface PairScore {
  readonly km: number;
  readonly overlap: number;
  readonly score: number;
}

type Pair = PairScore;

const EARTH_RADIUS_KM = 6371;
const TIME_WINDOW_MIN = 30;
const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

const near = (a: string | undefined, b: string | undefined): boolean =>
  a !== undefined && b !== undefined && Math.abs(toMinutes(a) - toMinutes(b)) <= TIME_WINDOW_MIN;

/** One point per weekday leg (out/back) where both members travel within 30 minutes of each other. */
export function scheduleOverlap(a: WeeklySchedule, b: WeeklySchedule): number {
  return WEEKDAYS.reduce((points, day) => {
    const x: DaySchedule | undefined = a[day];
    const y: DaySchedule | undefined = b[day];
    if (!x || !y) return points;
    return points + (near(x.out, y.out) ? 1 : 0) + (near(x.back, y.back) ? 1 : 0);
  }, 0);
}

/**
 * How well two members commute together: schedule overlap points plus closeness (0..1).
 * Null when either has no area, they live farther apart than maxDistanceKm or never travel together.
 */
export function scorePair(x: Pick<Member, 'area' | 'schedule'>, y: Pick<Member, 'area' | 'schedule'>, maxDistanceKm: number): PairScore | null {
  if (x.area === null || y.area === null) return null;
  const km = haversineKm(x.area, y.area);
  const overlap = scheduleOverlap(x.schedule, y.schedule);
  if (km > maxDistanceKm || overlap === 0) return null;
  return { km, overlap, score: overlap + (1 - km / maxDistanceKm) };
}

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Greedy crew suggestions: members within maxDistanceKm whose schedules overlap are grouped
 * (best pairs first) into crews of 2..maxSize. Every suggested crew has at least one driver.
 */
export function suggestCrews(members: readonly Member[], { maxSize = 4, maxDistanceKm = 5 }: SuggestOptions = {}): CrewSuggestion[] {
  const size = Math.min(maxSize, MAX_CREW_SIZE);
  const pool = members.filter((m) => m.status === 'active' && m.area !== null);
  const byId = new Map(pool.map((m) => [m.uid, m]));
  const pairs = new Map<string, Pair>();
  const seeds: { readonly a: string; readonly b: string; readonly score: number }[] = [];
  for (const [i, x] of pool.entries()) {
    for (const y of pool.slice(i + 1)) {
      const pair = scorePair(x, y, maxDistanceKm);
      if (pair === null) continue;
      pairs.set(pairKey(x.uid, y.uid), pair);
      seeds.push({ a: x.uid, b: y.uid, score: pair.score });
    }
  }
  seeds.sort((p, q) => q.score - p.score || pairKey(p.a, p.b).localeCompare(pairKey(q.a, q.b)));

  const canDrive = (uid: string): boolean => byId.get(uid)?.canDrive === true;
  const crewPairs = (ids: readonly string[]): Pair[] =>
    ids.flatMap((a, i) => ids.slice(i + 1).flatMap((b) => pairs.get(pairKey(a, b)) ?? []));
  const used = new Set<string>();
  const suggestions: CrewSuggestion[] = [];

  for (const seed of seeds) {
    if (size < 2 || used.has(seed.a) || used.has(seed.b)) continue;
    const crew = [seed.a, seed.b];
    while (crew.length < size) {
      const needsDriver = crew.length === size - 1 && !crew.some(canDrive);
      const best = pool
        .map((m) => m.uid)
        .filter((uid) => !used.has(uid) && !crew.includes(uid) && (!needsDriver || canDrive(uid)))
        .filter((uid) => crew.every((c) => pairs.has(pairKey(c, uid))))
        .map((uid) => ({ uid, gain: crew.reduce((sum, c) => sum + (pairs.get(pairKey(c, uid))?.score ?? 0), 0) }))
        .sort((p, q) => q.gain - p.gain || p.uid.localeCompare(q.uid))[0];
      if (!best) break;
      crew.push(best.uid);
    }
    const drivers = crew.filter(canDrive).length;
    if (drivers === 0) continue;
    for (const uid of crew) used.add(uid);
    const all = crewPairs(crew);
    const score = all.reduce((sum, p) => sum + p.score, 0) / all.length;
    suggestions.push({
      memberIds: [...crew].sort(),
      score,
      reasons: [
        { key: 'suggest.reason.nearby', params: { km: Math.round(Math.max(...all.map((p) => p.km)) * 10) / 10 } },
        { key: 'suggest.reason.schedule', params: { matches: Math.min(...all.map((p) => p.overlap)) } },
        { key: 'suggest.reason.drivers', params: { count: drivers } },
      ],
    });
  }
  return suggestions.sort((p, q) => q.score - p.score);
}
