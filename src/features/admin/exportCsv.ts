import type { DateRange } from '../../data/trips';
import type { Member } from '../../domain/types';
import { monthRange, tripsCsv, tripsInRange, type CrewTrips, type CsvLabels } from './stats';

export interface MonthCsvInput {
  /** Fresh read of every running crew's trips for the given ranges. */
  readonly load: (ranges: readonly DateRange[]) => Promise<readonly CrewTrips[]>;
  readonly month: string;
  readonly members: readonly Member[];
  readonly moneyEnabled: boolean;
  readonly labels: CsvLabels;
}

/** The month's CSV, built from a query made now: a cost, cancel or driver change since the page loaded is included. */
export async function monthCsv({ load, month, members, moneyEnabled, labels }: MonthCsvInput): Promise<string> {
  const range = monthRange(month);
  const crews = tripsInRange(await load([range]), range);
  return tripsCsv({ crews, members, moneyEnabled, labels });
}
