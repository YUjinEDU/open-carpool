import { listMyGroups } from '../../data/groups';
import { useLoad } from '../../shared/lib/loadable';

export const useMyGroups = (uid: string) => useLoad(() => listMyGroups(uid), [uid]);
