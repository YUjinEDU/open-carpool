import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { acceptCrew, declineCrew } from '../../data/crews';
import type { Crew } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { showToast } from '../../shared/ui';

/** Accept or decline a proposed crew I was added to. `canRespond` is false once I answered or when the crew is not a proposal. */
export function useProposalActions(crew: Pick<Crew, 'id' | 'status' | 'memberIds' | 'acceptedIds' | 'captainId'>) {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const canRespond = crew.status === 'proposed' && crew.memberIds.includes(me.uid) && !crew.acceptedIds.includes(me.uid);
  const accept = useAction(async () => {
    const updated = await acceptCrew(group.id, crew.id, me.uid);
    showToast(t(updated.status === 'active' ? 'crews.activeToast' : 'crews.acceptedToast'), 'success');
  });
  const decline = useAction(async (onDone?: () => void) => {
    await declineCrew(group.id, crew.id, me.uid);
    showToast(t('crews.declined'), 'info');
    onDone?.();
  }, { report: 'inline' });
  return { canRespond, accept, decline, isCaptain: crew.captainId === me.uid } as const;
}
