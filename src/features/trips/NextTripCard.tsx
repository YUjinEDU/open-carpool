import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGroup } from '../../app/providers/group';
import { addDays } from '../../domain/dates';
import { isPastCutoff } from '../../domain/planning';
import { GROUP_TZ } from './hooks';
import { legTime, type CrewTrip } from './nextTrip';
import { formatTripDate } from './TripCard';
import { tripActions } from './tripActions';

export interface NextTripCardProps {
  readonly next: CrewTrip;
  readonly names: ReadonlyMap<string, string>;
}

/** Group home summary of my next trip; the primary action opens the crew page where it is performed. */
export function NextTripCard({ next: { crew, trip }, names }: NextTripCardProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const now = new Date();
  const actions = tripActions(trip, { me, crew, now, policy: group.policy, tz: GROUP_TZ });
  const name = (uid: string) => names.get(uid) ?? uid;
  const primary = actions.done ? 'trip.done' : actions.volunteer ? 'trip.volunteer' : 'groupHome.openCrew';
  const frozen = isPastCutoff(trip.date, group.policy.absenceCutoffHour, now, GROUP_TZ);

  return (
    <section aria-labelledby="next-trip-heading" data-testid="next-trip-card">
      <h2 id="next-trip-heading">{t('groupHome.nextTrip')}</h2>
      <p>
        {crew.name} · {formatTripDate(trip.date, i18n.language)} · {t(`trip.leg.${trip.leg}`)} {legTime(crew, trip.leg)}
      </p>
      <p>
        {t('trip.driver')}: <span data-testid="trip-driver">{trip.driverId ? name(trip.driverId) : t('trip.driverNeeded')}</span>
      </p>
      <p>
        {t('trip.riders')}: {trip.riderIds.length > 0 ? trip.riderIds.map(name).join(', ') : t('trip.noRiders')}
      </p>
      <p>{frozen ? t('trip.frozen') : t('trip.cutoff', { date: addDays(trip.date, -1), hour: group.policy.absenceCutoffHour })}</p>
      <Link to={`crews/${crew.id}`} data-testid="next-trip-action">
        {t(primary)}
      </Link>
    </section>
  );
}
