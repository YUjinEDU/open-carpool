import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AlertTriangle, Car, ChevronRight, MapPin } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { addDays, today } from '../../domain/dates';
import { formatDate, joinNames } from '../../shared/lib/format';
import { useNow } from '../../shared/lib/useNow';
import { Avatar, AvatarStack, Badge, Button, Card } from '../../shared/ui';
import { minutesUntilCutoff } from './cutoff';
import { GROUP_TZ } from './hooks';
import { legTime, type CrewTrip } from './nextTrip';
import { TripActionBar } from './TripActionBar';

export interface NextTripCardProps {
  readonly next: CrewTrip;
  readonly names: ReadonlyMap<string, string>;
}

/** Remaining time as "2시간 14분" / "35분" / "2일 3시간". */
export function formatRemaining(minutes: number, t: TFunction): string {
  const m = Math.max(0, Math.round(minutes));
  if (m >= 1440) return t('groupHome.remainingDays', { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60) });
  if (m >= 60) return t('groupHome.remainingHours', { h: Math.floor(m / 60), m: m % 60 });
  return t('groupHome.remainingMinutes', { m });
}

/** The evening card: tomorrow's (or today's) answer in one glance and the absence verb one tap away. */
export function NextTripCard({ next: { crew, trip }, names }: NextTripCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group, me } = useGroup();
  const now = useNow();
  const todayDate = today(GROUP_TZ, now);
  const tomorrow = addDays(todayDate, 1);
  const name = (uid: string) => names.get(uid) ?? uid;
  const label =
    trip.date === todayDate
      ? t(trip.leg === 'out' ? 'groupHome.todayOut' : 'groupHome.todayBack')
      : trip.date === tomorrow
        ? t(trip.leg === 'out' ? 'groupHome.tomorrowOut' : 'groupHome.tomorrowBack')
        : t('groupHome.upcoming');
  const time = legTime(crew, trip.leg);
  const needsDriver = trip.driverId === null;
  const headline = needsDriver ? t('groupHome.needsDriver') : trip.driverId === me.uid ? t('groupHome.youDrive') : t('groupHome.drives', { name: name(trip.driverId) });
  const riders = trip.riderIds.map((uid) => ({ name: name(uid) }));
  const remaining = minutesUntilCutoff(trip.date, group.policy.absenceCutoffHour, now, GROUP_TZ);
  const deadline = addDays(trip.date, -1);
  const cutoffLabel =
    deadline === todayDate
      ? t('groupHome.cutoffToday', { hour: group.policy.absenceCutoffHour })
      : t('groupHome.cutoffOn', { date: formatDate(deadline, i18n.language), hour: group.policy.absenceCutoffHour });
  const crewHref = `/g/${group.id}/crews/${crew.id}`;

  return (
    <Card variant="inverse" padding="lg" className="flex flex-col gap-4" as="section" aria-label={label} data-testid="next-trip-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sub font-medium text-ink-2">{label}</p>
          <p className="mt-0.5 text-sub tabular-nums text-ink-2">
            {formatDate(trip.date, i18n.language)} {t(trip.leg === 'out' ? 'groupHome.departs' : 'groupHome.returns', { time })}
          </p>
        </div>
        {needsDriver ? (
          <Badge variant="warn" icon={<AlertTriangle />}>{t('trip.status.needs_driver')}</Badge>
        ) : (
          <Badge variant="brand">{t('trip.status.planned')}</Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!needsDriver && trip.driverId && (
          <Avatar name={name(trip.driverId)} size="lg" tint="neutral" className="bg-accent-wash-strong text-ink" marker={<Car />} />
        )}
        <div className="min-w-0">
          <p className="text-title-1 text-ink">
            {needsDriver ? headline : <span data-testid="trip-driver">{headline}</span>}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sub text-ink-2">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{crew.pickupNote || crew.name}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-control bg-accent-wash px-3 py-2.5 text-sub text-ink-2">
        {riders.length > 0 ? (
          <>
            <AvatarStack people={riders} size="xs" max={4} />
            <span className="min-w-0 truncate">{t('groupHome.riders', { names: joinNames(riders.map((r) => r.name)) })}</span>
          </>
        ) : (
          <span>{t('groupHome.noRiders')}</span>
        )}
      </div>

      {remaining > 0 ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sub text-ink-2">{t('groupHome.untilCutoff')}</p>
          <p className="text-title-2 tabular-nums text-ink">
            {formatRemaining(remaining, t)} <span className="text-caption font-normal text-ink-3">({cutoffLabel})</span>
          </p>
        </div>
      ) : (
        <p className="text-caption text-ink-3">{t('groupHome.cutoffPassed')}</p>
      )}

      <TripActionBar crew={crew} trip={trip} names={names} variant="hero">
        <Button variant="ghost" trailingIcon={<ChevronRight />} onClick={() => navigate(crewHref)} data-testid="next-trip-action">
          {t('groupHome.openCrew')}
        </Button>
      </TripActionBar>
    </Card>
  );
}
