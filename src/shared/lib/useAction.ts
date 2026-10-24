import { useCallback, useRef, useState } from 'react';
import { showToast } from '../ui';
import { InviteNotFoundError, MembershipRemovedError } from '../../data/groups';
import { CarFullError, SeatsBelowRidersError } from '../../data/events';
import { DriverTakenError, TripAlreadyAppliedError } from '../../data/trips';
import i18n from '../i18n';

/** User-facing text for a failed action. */
export function describeError(e: unknown): string {
  if (e instanceof InviteNotFoundError) return i18n.t('join.notFound');
  if (e instanceof MembershipRemovedError) return i18n.t('join.removed');
  if (e instanceof DriverTakenError) return i18n.t('trip.driverTaken');
  if (e instanceof TripAlreadyAppliedError) return i18n.t('trip.alreadyApplied');
  if (e instanceof CarFullError) return i18n.t('events.carFull');
  if (e instanceof SeatsBelowRidersError) return i18n.t('events.seatsBelowRiders');
  return i18n.t('common.errorWith', { message: e instanceof Error ? e.message : String(e) });
}

/** Wrap an async UI action: tracks `busy`, ignores calls while one is in flight and reports failures with a toast. */
export function useAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  // A ref, not `busy`: a double tap lands twice before the re-render that would disable the button.
  const inFlight = useRef(false);
  const run = useCallback(
    (...args: A) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      action(...args)
        .catch((e: unknown) => showToast(describeError(e), 'error'))
        .finally(() => {
          inFlight.current = false;
          setBusy(false);
        });
    },
    [action],
  );
  return { busy, run } as const;
}
