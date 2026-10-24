import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { addDays, today } from '../../domain/dates';
import type { Crew, Trip } from '../../domain/types';
import { formatDate } from '../../shared/lib/format';
import { Button, Dialog, cx } from '../../shared/ui';
import { CompleteSheet } from './CompleteSheet';
import { GROUP_TZ } from './hooks';
import { tripActions } from './tripActions';
import { useTripMutations } from './useTripMutations';

type Confirm = 'absent' | 'cant-drive' | 'volunteer';

export interface TripActionBarProps {
  readonly crew: Crew;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
  /** card = small buttons in a plan row; hero = one main verb in the evening card's two-column row. */
  readonly variant?: 'card' | 'hero';
  /** Extra control rendered after the verbs (the hero's "View crew"). */
  readonly children?: ReactNode;
}

/** The verbs a member has on a trip, each confirmed in a Dialog; completion opens the roster Sheet. */
export function TripActionBar({ crew, trip, names, variant = 'card', children }: TripActionBarProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const actions = tripActions(trip, { me, crew, now: new Date(), policy: group.policy, tz: GROUP_TZ });
  const m = useTripMutations(crew, trip);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [completing, setCompleting] = useState(false);
  const hero = variant === 'hero';
  const size = hero ? 'md' : 'sm';
  const date = formatDate(trip.date, i18n.language);
  const todayDate = today(GROUP_TZ);
  const absentLabel =
    hero && trip.date === addDays(todayDate, 1) ? t('trip.markAbsentTomorrow') : hero && trip.date === todayDate ? t('trip.markAbsentToday') : t('trip.markAbsent');

  const done = actions.done && (
    <Button key="done" size={size} onClick={() => setCompleting(true)} data-testid="trip-done">
      {t('trip.done')}
    </Button>
  );
  const volunteer = actions.volunteer && (
    <Button key="volunteer" size={size} onClick={() => setConfirm('volunteer')} data-testid="trip-volunteer">
      {t('trip.volunteer')}
    </Button>
  );
  const cantDrive = actions.cantDrive && (
    <Button key="cant-drive" size={size} variant="secondary" loading={m.giveUp.busy} onClick={() => setConfirm('cant-drive')} data-testid="trip-cant-drive">
      {t('trip.cantDrive')}
    </Button>
  );
  const absence = actions.absence !== null && (
    <Button
      key="absence"
      size={size}
      variant="secondary"
      loading={m.absence.busy}
      onClick={() => (actions.absence === 'mark-absent' ? setConfirm('absent') : m.absence.run(false))}
      data-testid="trip-absent-toggle"
    >
      {actions.absence === 'mark-absent' ? absentLabel : t('trip.markBack')}
    </Button>
  );
  // The hero shows one verb: the most urgent one that applies.
  const verbs = hero ? [done || volunteer || cantDrive || absence] : [done, volunteer, cantDrive, absence];
  const shown = verbs.filter(Boolean);

  return (
    <>
      {(shown.length > 0 || children) && (
        <div className={cx(hero ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2 pt-1')}>
          {shown}
          {children}
        </div>
      )}
      <Dialog
        open={confirm === 'absent'}
        onClose={() => setConfirm(null)}
        role="alertdialog"
        title={t('trip.absentConfirmTitle', { date })}
        description={t('trip.absentConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                setConfirm(null);
                m.absence.run(true);
              }}
              data-testid="trip-absent-confirm"
            >
              {t('trip.absentAction')}
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === 'cant-drive'}
        onClose={() => setConfirm(null)}
        role="alertdialog"
        title={t('trip.cantDriveTitle')}
        description={t('trip.cantDriveBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                setConfirm(null);
                m.giveUp.run();
              }}
              data-testid="trip-cant-drive-confirm"
            >
              {t('trip.cantDriveAction')}
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === 'volunteer'}
        onClose={() => setConfirm(null)}
        role="alertdialog"
        title={t('trip.volunteerTitle', { date })}
        description={t('trip.volunteerBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                setConfirm(null);
                m.volunteer.run();
              }}
              data-testid="trip-volunteer-confirm"
            >
              {t('trip.volunteerAction')}
            </Button>
          </>
        }
      />
      {actions.done && (
        <CompleteSheet
          open={completing}
          onClose={() => setCompleting(false)}
          crew={crew}
          trip={trip}
          names={names}
          meUid={me.uid}
          busy={m.complete.busy}
          onConfirm={(riderIds) => m.complete.run(riderIds, () => setCompleting(false))}
        />
      )}
    </>
  );
}
