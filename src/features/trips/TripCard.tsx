import { useTranslation } from 'react-i18next';
import { Car } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { plateAllowed } from '../../domain/policies';
import type { Crew, Member, Trip } from '../../domain/types';
import { formatDate, joinNames } from '../../shared/lib/format';
import { Badge } from '../../shared/ui';
import { DayCell } from './DayCell';
import { legTime } from './nextTrip';
import { TripActionBar } from './TripActionBar';
import { TripCost } from './TripCost';
import { TripStatusBadge } from './TripStatusBadge';
import { useTripMutations } from './useTripMutations';

export interface TripCardProps {
  readonly crew: Crew;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
  /** Crew members, for the plate-rule badge; names alone are enough without plate rotation. */
  readonly members?: readonly Member[];
  readonly highlight?: boolean;
}

/** One row of the weekly plan: day cell, driver, riders, status and the verbs available to me. */
export function TripCard({ crew, trip, names, members = [], highlight = false }: TripCardProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const m = useTripMutations(crew, trip);
  const name = (uid: string) => names.get(uid) ?? uid;
  const time = legTime(crew, trip.leg);
  const excludedByPlate =
    group.policy.plateRotation === 'none'
      ? []
      : members
          .filter((member) => crew.memberIds.includes(member.uid) && member.canDrive && !trip.absentIds.includes(member.uid))
          .filter((member) => !plateAllowed(group.policy.plateRotation, member.plateLastDigit, trip.date))
          .map((member) => member.displayName);

  return (
    <li data-testid={`trip-card-${trip.id}`} className="flex gap-3 px-4 py-3">
      <DayCell date={trip.date} locale={i18n.language} highlight={highlight} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-body font-medium text-ink">
            <span data-testid="trip-driver">{trip.driverId ? name(trip.driverId) : t('trip.driverNeeded')}</span>
            {trip.driverId && <span className="text-ink-2"> {t('trip.driveSuffix')}</span>}
          </p>
          <TripStatusBadge trip={trip} meUid={me.uid} />
        </div>
        <p className="text-sub text-ink-2">
          <span className="tabular-nums">{time}</span> {t(`trip.leg.${trip.leg}`)} ·{' '}
          {trip.riderIds.length > 0 ? t('trip.ridersLine', { names: joinNames(trip.riderIds.map(name)) }) : t('trip.noRiders')}
        </p>
        {trip.absentIds.length > 0 && <p className="text-caption text-ink-3">{t('trip.absentLine', { names: joinNames(trip.absentIds.map(name)) })}</p>}
        {excludedByPlate.length > 0 && (
          <div>
            <Badge variant="info" icon={<Car />} title={t('trip.plateRuleHint', { names: joinNames(excludedByPlate) })} data-testid="trip-plate-rule">
              {t('trip.plateRule')}
            </Badge>
          </div>
        )}
        <span className="sr-only">{formatDate(trip.date, i18n.language)}</span>
        <TripActionBar crew={crew} trip={trip} names={names} />
        <TripCost group={group} trip={trip} names={names} onSave={(cost) => m.saveCost.run(cost)} />
      </div>
    </li>
  );
}
