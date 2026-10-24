import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Trip } from '../../domain/types';

export interface CompletePanelProps {
  readonly trip: Trip;
  /** Crew members other than the driver, in display order. */
  readonly roster: readonly { readonly uid: string; readonly name: string }[];
  readonly busy: boolean;
  readonly onConfirm: (riderIds: string[]) => void;
  readonly onCancel: () => void;
}

/** "Who rode?" confirmation: present riders pre-checked; unchecking someone leaves their ledger untouched. */
export function CompletePanel({ trip, roster, busy, onConfirm, onCancel }: CompletePanelProps) {
  const { t } = useTranslation();
  const [riders, setRiders] = useState<readonly string[]>(trip.riderIds);
  const toggle = (uid: string, rode: boolean) =>
    setRiders((prev) => (rode ? [...new Set([...prev, uid])] : prev.filter((id) => id !== uid)));

  return (
    <fieldset data-testid="trip-done-panel">
      <legend>{t('trip.doneTitle')}</legend>
      {roster.map(({ uid, name }) => (
        <div key={uid}>
          <input
            id={`trip-done-${trip.id}-${uid}`}
            type="checkbox"
            checked={riders.includes(uid)}
            onChange={(e) => toggle(uid, e.target.checked)}
            data-testid={`trip-done-rider-${uid}`}
          />
          <label htmlFor={`trip-done-${trip.id}-${uid}`}>{name}</label>
        </div>
      ))}
      <button type="button" disabled={busy} onClick={() => onConfirm([...riders])} data-testid="trip-done-confirm">
        {t('trip.confirm')}
      </button>
      <button type="button" onClick={onCancel}>
        {t('trip.cancel')}
      </button>
    </fieldset>
  );
}
