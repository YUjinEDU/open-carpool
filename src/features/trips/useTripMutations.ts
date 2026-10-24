import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { completeTrip, giveUpDriving, markAbsent, setTripCost, volunteerToDrive } from '../../data/trips';
import type { Crew, Trip, TripCost } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { dismissToast, showToast } from '../../shared/ui';

/** How long "Trip done" can be undone before the ledger transaction runs. */
export const COMPLETE_UNDO_MS = 10_000;

/**
 * Wait `ms` with an undo toast. Resolves true when the delay ran out (commit), false when the user
 * pressed undo. The timer is not tied to a component, so leaving the screen still commits.
 */
function undoableDelay(ms: number, message: string, undoLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    let toastId = 0;
    const timer = window.setTimeout(() => {
      dismissToast(toastId);
      resolve(true);
    }, ms);
    toastId = showToast(message, 'info', {
      durationMs: ms,
      action: {
        label: undoLabel,
        onClick: () => {
          window.clearTimeout(timer);
          resolve(false);
        },
      },
    });
  });
}

/**
 * The writes a member can make on one trip. Failures are kept inline (`error`) so the dialog or row
 * that triggered them can show the cause next to the control; `onDone` runs after a successful write.
 */
export function useTripMutations(crew: Pick<Crew, 'id'>, trip: Pick<Trip, 'id' | 'driverId'>) {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const gid = group.id;
  const cid = crew.id;
  const tripId = trip.id;

  const absence = useAction(async (absent: boolean, onDone?: () => void) => {
    await markAbsent(gid, cid, tripId, me.uid, absent);
    onDone?.();
  }, { report: 'inline' });
  const giveUp = useAction(async (onDone?: () => void) => {
    await giveUpDriving(gid, cid, tripId, me.uid);
    onDone?.();
  }, { report: 'inline' });
  const volunteer = useAction(async (onDone?: () => void) => {
    await volunteerToDrive(gid, cid, tripId, me.uid);
    onDone?.();
  }, { report: 'inline' });
  // The roster sheet closes at once; the ledger write waits for the undo window to pass.
  const complete = useAction(async (riderIds: string[], onDone: () => void) => {
    if (trip.driverId === null) return;
    onDone();
    const commit = await undoableDelay(COMPLETE_UNDO_MS, t('trip.completing', { seconds: COMPLETE_UNDO_MS / 1000 }), t('common.undo'));
    if (!commit) {
      showToast(t('trip.completionUndone'), 'info');
      return;
    }
    await completeTrip(gid, cid, tripId, { driverId: trip.driverId, riderIds }, me.uid);
    showToast(t('trip.completedToast'), 'success');
  });
  const saveCost = useAction(async (cost: TripCost) => {
    await setTripCost(gid, cid, tripId, cost);
    showToast(t('common.saved'), 'success');
  });
  return { absence, giveUp, volunteer, complete, saveCost } as const;
}
