import { listMembers } from '../../data/members';
import { useLoad } from '../../shared/lib/loadable';

export const useMembers = (gid: string) => useLoad(() => listMembers(gid), [gid]);
