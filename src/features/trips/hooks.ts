import { subscribeTrips, type DateRange } from '../../data/trips';
import type { Trip } from '../../domain/types';
import { useSubscription } from '../../shared/lib/loadable';

export const useTrips = (gid: string, cid: string, range: DateRange) =>
  useSubscription<Trip[]>(
    (onData, onError) => subscribeTrips({ gid, cid, range }, onData, onError),
    [gid, cid, range.from, range.to],
  );
