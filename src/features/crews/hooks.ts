import { subscribeCrews } from '../../data/crews';
import type { Crew } from '../../domain/types';
import { useSubscription } from '../../shared/lib/loadable';

export const useCrews = (gid: string) => useSubscription<Crew[]>((onData, onError) => subscribeCrews(gid, onData, onError), [gid]);
