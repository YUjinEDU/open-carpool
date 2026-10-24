import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { showToast } from '../../components/Toast';
import { completeTrip, giveUpDriving, markAbsent, setTripCost, volunteerToDrive } from '../../data/trips';
import { addDays } from '../../domain/dates';
import type { Crew, Trip, TripCost as Cost } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { NavLinks } from '../map/NavLinks';
import { CompletePanel } from './CompletePanel';
import { GROUP_TZ } from './hooks';
import { legTime } from './nextTrip';
import { TripCost } from './TripCost';
import { tripActions } from './tripActions';

export interface TripCardProps {
  readonly crew: Crew;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
}

export const formatTripDate = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

/** One trip of the weekly plan with the actions available to me. */
export function TripCard({ crew, trip, names }: TripCardProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const [confirming, setConfirming] = useState(false);
  const actions = tripActions(trip, { me, crew, now: new Date(), policy: group.policy, tz: GROUP_TZ });
  const name = (uid: string) => names.get(uid) ?? uid;
  const ids = { gid: group.id, cid: crew.id, tripId: trip.id };

  const absence = useAction(async (absent: boolean) => {
    await markAbsent(ids.gid, ids.cid, ids.tripId, me.uid, absent);
    showToast(t(absent ? 'trip.absentToast' : 'trip.backToast'), 'success');
  });
  const giveUp = useAction(async () => {
    await giveUpDriving(ids.gid, ids.cid, ids.tripId);
    showToast(t('trip.gaveUpToast'), 'info');
  });
  const volunteer = useAction(async () => {
    await volunteerToDrive(ids.gid, ids.cid, ids.tripId, me.uid);
    showToast(t('trip.volunteeredToast'), 'success');
  });
  const complete = useAction(async (riderIds: string[]) => {
    if (trip.driverId === null) return;
    await completeTrip(ids.gid, ids.cid, ids.tripId, { driverId: trip.driverId, riderIds }, me.uid);
    setConfirming(false);
    showToast(t('trip.completedToast'), 'success');
  });
  const saveCost = useAction(async (cost: Cost) => {
    await setTripCost(ids.gid, ids.cid, ids.tripId, cost);
    showToast(t('common.saved'), 'success');
  });

  const roster = crew.memberIds.filter((uid) => uid !== trip.driverId).map((uid) => ({ uid, name: name(uid) }));
  return (
    <li data-testid={`trip-card-${trip.id}`} className="p-4">
      <p>
        {formatTripDate(trip.date, i18n.language)} · {t(`trip.leg.${trip.leg}`)} {legTime(crew, trip.leg)}
      </p>
      <p>
        {t('trip.driver')}: <span data-testid="trip-driver">{trip.driverId ? name(trip.driverId) : t('trip.driverNeeded')}</span>
      </p>
      <p>
        {t('trip.riders')}: {trip.riderIds.length > 0 ? trip.riderIds.map(name).join(', ') : t('trip.noRiders')}
      </p>
      {trip.absentIds.length > 0 && (
        <p>
          {t('trip.absent')}: {trip.absentIds.map(name).join(', ')}
        </p>
      )}
      {actions.absence !== null && (
        <p>{t('trip.cutoff', { date: addDays(trip.date, -1), hour: group.policy.absenceCutoffHour })}</p>
      )}
      {actions.absence !== null && (
        <button
          type="button"
          disabled={absence.busy}
          onClick={() => absence.run(actions.absence === 'mark-absent')}
          data-testid="trip-absent-toggle"
        >
          {t(actions.absence === 'mark-absent' ? 'trip.markAbsent' : 'trip.markBack')}
        </button>
      )}
      {actions.cantDrive && (
        <button type="button" disabled={giveUp.busy} onClick={() => giveUp.run()} data-testid="trip-cant-drive">
          {t('trip.cantDrive')}
        </button>
      )}
      {actions.volunteer && (
        <button type="button" disabled={volunteer.busy} onClick={() => volunteer.run()} data-testid="trip-volunteer">
          {t('trip.volunteer')}
        </button>
      )}
      {actions.done && !confirming && (
        <button type="button" onClick={() => setConfirming(true)} data-testid="trip-done">
          {t('trip.done')}
        </button>
      )}
      {actions.done && confirming && (
        <CompletePanel
          trip={trip}
          roster={roster}
          busy={complete.busy}
          onConfirm={(riderIds) => complete.run(riderIds)}
          onCancel={() => setConfirming(false)}
        />
      )}
      {actions.completed && <p data-testid="trip-completed">{t('trip.completed')}</p>}
      <TripCost group={group} trip={trip} names={names} onSave={(cost) => saveCost.run(cost)} />
      {group.destination && <NavLinks group={group} />}
    </li>
  );
}
