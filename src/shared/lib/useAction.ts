import { useCallback, useState } from 'react';
import { showToast } from '../../components/Toast';
import { InviteNotFoundError, MembershipRemovedError } from '../../data/groups';
import { DriverTakenError } from '../../data/trips';
import i18n from '../i18n';

/** User-facing text for a failed action. */
export function describeError(e: unknown): string {
  if (e instanceof InviteNotFoundError) return i18n.t('join.notFound');
  if (e instanceof MembershipRemovedError) return i18n.t('join.removed');
  if (e instanceof DriverTakenError) return i18n.t('trip.driverTaken');
  return i18n.t('common.errorWith', { message: e instanceof Error ? e.message : String(e) });
}

/** Wrap an async UI action: tracks `busy` and reports failures with a toast. */
export function useAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    (...args: A) => {
      setBusy(true);
      action(...args)
        .catch((e: unknown) => showToast(describeError(e), 'error'))
        .finally(() => setBusy(false));
    },
    [action],
  );
  return { busy, run } as const;
}
