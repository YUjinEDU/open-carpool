import { FirebaseError } from 'firebase/app';
import { useCallback, useRef, useState } from 'react';
import { showToast } from '../ui';
import { InviteNotFoundError, MembershipRemovedError } from '../../data/groups';
import { CarFullError, SeatsBelowRidersError } from '../../data/events';
import { DriverTakenError, TripAlreadyAppliedError } from '../../data/trips';
import { GeocodeError } from '../../features/map/geocoder';
import i18n from '../i18n';

/** Firebase (Firestore + Auth) codes with a sentence of their own; everything else gets the generic one. */
const FIREBASE_CODES: Record<string, string> = {
  'permission-denied': 'common.error.permission',
  unauthenticated: 'common.error.signedOut',
  unavailable: 'common.error.network',
  'deadline-exceeded': 'common.error.network',
  'resource-exhausted': 'common.error.busy',
  'failed-precondition': 'common.error.conflict',
  aborted: 'common.error.conflict',
  'not-found': 'common.error.notFound',
  'auth/network-request-failed': 'common.error.network',
  'auth/popup-closed-by-user': 'common.error.popupClosed',
  'auth/cancelled-popup-request': 'common.error.popupClosed',
  'auth/user-cancelled': 'common.error.popupClosed',
  'auth/too-many-requests': 'common.error.busy',
  'auth/invalid-email': 'common.error.invalidEmail',
  'auth/invalid-action-code': 'signinFinish.invalidHint',
  'auth/expired-action-code': 'signinFinish.invalidHint',
};

/** User-facing text for a failed action: a plain sentence in the UI language, never raw SDK text. */
export function describeError(e: unknown): string {
  if (e instanceof InviteNotFoundError) return i18n.t('join.notFound');
  if (e instanceof MembershipRemovedError) return i18n.t('join.removed');
  if (e instanceof DriverTakenError) return i18n.t('trip.driverTaken');
  if (e instanceof TripAlreadyAppliedError) return i18n.t('trip.alreadyApplied');
  if (e instanceof CarFullError) return i18n.t('events.carFull');
  if (e instanceof SeatsBelowRidersError) return i18n.t('events.seatsBelowRiders');
  if (e instanceof GeocodeError) return i18n.t('place.searchFailed');
  if (e instanceof FirebaseError) {
    const key = FIREBASE_CODES[e.code] ?? FIREBASE_CODES[e.code.replace(/^firestore\//, '')];
    if (key) return i18n.t(key);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return i18n.t('common.error.network');
  // The sentence stays generic for the user; the cause goes to the console for whoever debugs it.
  console.error(e);
  return i18n.t('common.unexpected');
}

export interface UseActionOptions {
  /**
   * Where a failure is reported. 'toast' (default): a sticky error toast.
   * 'inline': kept in `error` so the caller renders it next to the control (dialogs, sheets, forms).
   */
  readonly report?: 'toast' | 'inline';
}

/**
 * Wrap an async UI action: tracks `busy`, ignores calls while one is in flight and reports failures
 * (toast, or `error` for inline rendering). `clearError` resets the inline message.
 */
export function useAction<A extends unknown[]>(action: (...args: A) => Promise<void>, { report = 'toast' }: UseActionOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not `busy`: a double tap lands twice before the re-render that would disable the button.
  const inFlight = useRef(false);
  const run = useCallback(
    (...args: A) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      action(...args)
        .catch((e: unknown) => {
          const message = describeError(e);
          if (report === 'inline') setError(message);
          else showToast(message, 'error');
        })
        .finally(() => {
          inFlight.current = false;
          setBusy(false);
        });
    },
    [action, report],
  );
  const clearError = useCallback(() => setError(null), []);
  return { busy, run, error, clearError } as const;
}
