import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { completeTrip, giveUpDriving, markAbsent, setTripCost, volunteerToDrive } from '../../data/trips';
import type { Crew, Trip, TripCost } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { showToast } from '../../shared/ui';

/** The writes a member can make on one trip, each with its busy flag and a toast for outcomes not visible in place. */
export function useTripMutations(crew: Pick<Crew, 'id'>, trip: Pick<Trip, 'id' | 'driverId'>) {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const gid = group.id;
  const cid = crew.id;
  const tripId = trip.id;

  const absence = useAction(async (absent: boolean) => {
    await markAbsent(gid, cid, tripId, me.uid, absent);
    showToast(t(absent ? 'trip.absentToast' : 'trip.backToast'), 'success');
  });
  const giveUp = useAction(async () => {
    await giveUpDriving(gid, cid, tripId, me.uid);
    showToast(t('trip.gaveUpToast'), 'info');
  });
  const volunteer = useAction(async () => {
    await volunteerToDrive(gid, cid, tripId, me.uid);
    showToast(t('trip.volunteeredToast'), 'success');
  });
  const complete = useAction(async (riderIds: string[], onDone: () => void) => {
    if (trip.driverId === null) return;
    await completeTrip(gid, cid, tripId, { driverId: trip.driverId, riderIds }, me.uid);
    onDone();
    showToast(t('trip.completedToast'), 'success');
  });
  const saveCost = useAction(async (cost: TripCost) => {
    await setTripCost(gid, cid, tripId, cost);
    showToast(t('common.saved'), 'success');
  });
  return { absence, giveUp, volunteer, complete, saveCost } as const;
}
