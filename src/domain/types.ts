/**
 * Domain model shared by the data layer, domain logic and UI.
 * Firestore layout is documented in .omo/plans/v1-phase0-3.md and docs/ARCHITECTURE.md.
 */

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO weekday: 1 = Monday ... 7 = Sunday
export type Leg = 'out' | 'back';
export type CountryCode = string; // ISO 3166-1 alpha-2, e.g. 'KR', 'US', 'JP'
export type Locale = 'ko' | 'en';

export interface LatLng { lat: number; lng: number }

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  locale: Locale;
  createdAt: string; // ISO timestamp
}

export type GroupType = 'company' | 'university' | 'club' | 'school' | 'church' | 'other';
export type CostMode = 'rotation' | 'actual-cost';
export type PlateRotation = 'none' | 'odd-even' | 'five-day';

export interface GroupPolicy {
  /** 'rotation' = no money, driving turns are the cost share. Forced for KR (see domain/policies). */
  costMode: CostMode;
  /** Local hour (0-23) on the day before a trip after which absences no longer change the plan. */
  absenceCutoffHour: number;
  plateRotation: PlateRotation;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  country: CountryCode;
  locale: Locale;
  ownerId: string;
  inviteCode: string;
  allowedEmailDomains: string[];
  destination: (LatLng & { label: string }) | null;
  policy: GroupPolicy;
  createdAt: string;
}

export type MemberRole = 'owner' | 'admin' | 'member';
/** 'left' = member left (may re-join with the current invite code); 'removed' = removed by an admin. */
export type MemberStatus = 'active' | 'left' | 'removed';

export interface DaySchedule { out?: string; back?: string } // 'HH:MM'
export type WeeklySchedule = Partial<Record<Weekday, DaySchedule>>;

export interface Member {
  uid: string;
  displayName: string;
  role: MemberRole;
  status: MemberStatus;
  canDrive: boolean;
  seats: number; // passenger seats offered when driving
  plateLastDigit: number | null; // 0-9, for plate-rotation policies
  areaLabel: string;
  area: LatLng | null; // coarse (rounded to 3 decimals) home area
  schedule: WeeklySchedule;
  joinedAt: string;
  inviteCode: string; // code used to join (validated by security rules)
}

export type CrewStatus = 'proposed' | 'active' | 'paused';

/** Fagin-Williams ledger: integer units, see domain/rotation. */
export type Scores = Record<string, number>;

export interface Crew {
  id: string;
  name: string;
  memberIds: string[]; // 2..6
  captainId: string;
  backupDriverIds: string[];
  acceptedIds: string[];
  status: CrewStatus;
  days: Weekday[];
  outTime: string | null; // 'HH:MM'
  backTime: string | null;
  pickupNote: string;
  waitLimitMin: number;
  scores: Scores;
  lastDroveOn: Record<string, string>; // uid -> 'YYYY-MM-DD'
  createdBy: string;
  createdAt: string;
}

export type TripStatus = 'planned' | 'needs_driver' | 'done' | 'cancelled';

export interface TripCost { totalAmount: number; currency: string }

export interface Trip {
  id: string; // `${date}_${leg}`
  date: string; // 'YYYY-MM-DD'
  leg: Leg;
  driverId: string | null;
  riderIds: string[];
  absentIds: string[];
  status: TripStatus;
  applied: boolean; // ledger already updated for this trip
  completedBy: string | null;
  completedAt: string | null;
  cost: TripCost | null; // only when the group policy allows money
}

export interface RideEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  createdBy: string;
  createdAt: string;
}

export interface EventCar {
  driverId: string;
  driverName: string;
  seats: number;
  riderIds: string[];
  note: string;
}

export const MAX_CREW_SIZE = 6;
