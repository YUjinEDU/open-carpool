import { scoreInRides } from '../../domain/rotation';
import type { Crew, Member } from '../../domain/types';

/** Ledger units as signed rides: '+0.5', '-0.5', '0' (at most two decimals). */
export function formatRides(units: number): string {
  const rides = Math.round(scoreInRides(units) * 100) / 100;
  if (rides === 0) return '0';
  return rides > 0 ? `+${rides}` : String(rides);
}

export interface LedgerRow {
  readonly uid: string;
  readonly name: string;
  readonly rides: string;
  readonly isCaptain: boolean;
  readonly isBackup: boolean;
}

export function ledgerRows(crew: Crew, members: readonly Member[]): LedgerRow[] {
  const names = new Map(members.map((m) => [m.uid, m.displayName]));
  return crew.memberIds.map((uid) => ({
    uid,
    name: names.get(uid) ?? uid,
    rides: formatRides(crew.scores[uid] ?? 0),
    isCaptain: crew.captainId === uid,
    isBackup: crew.backupDriverIds.includes(uid),
  }));
}
