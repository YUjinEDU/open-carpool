import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LoadingState } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { today } from '../../domain/dates';
import type { Crew, Member, Trip } from '../../domain/types';
import { useCrews } from '../crews/hooks';
import { NavLinks } from '../map/NavLinks';
import { useMembers } from '../members/hooks';
import { GROUP_TZ, useCrewPlan } from '../trips/hooks';
import { NextTripCard } from '../trips/NextTripCard';
import { pickNextTrip } from '../trips/nextTrip';

type TripsByCrew = Readonly<Record<string, readonly Trip[]>>;

/** Keeps one crew's plan current and reports its trips upward; renders nothing. */
function CrewPlanSource({ crew, members, onTrips }: {
  readonly crew: Crew;
  readonly members: readonly Member[];
  readonly onTrips: (cid: string, trips: readonly Trip[]) => void;
}) {
  const trips = useCrewPlan(crew, members);
  useEffect(() => {
    if (trips.status === 'ready') onTrips(crew.id, trips.data);
  }, [trips, crew.id, onTrips]);
  return null;
}

/** Group home: my next trip, my crews, empty states. */
export function GroupHomePage() {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const crews = useCrews(group.id);
  const [members] = useMembers(group.id);
  const [tripsByCrew, setTripsByCrew] = useState<TripsByCrew>({});
  const onTrips = useCallback((cid: string, trips: readonly Trip[]) => setTripsByCrew((prev) => ({ ...prev, [cid]: trips })), []);
  const mine = crews.status === 'ready' ? crews.data.filter((c) => c.memberIds.includes(me.uid)) : [];
  const activeMine = mine.filter((c) => c.status === 'active');
  const names = useMemo(
    () => new Map(members.status === 'ready' ? members.data.map((m) => [m.uid, m.displayName]) : []),
    [members],
  );
  const next = pickNextTrip(
    activeMine.flatMap((crew) => (tripsByCrew[crew.id] ?? []).map((trip) => ({ crew, trip }))),
    me.uid,
    today(GROUP_TZ),
  );
  const hasProfile = Object.keys(me.schedule).length > 0;

  return (
    <main className="p-4">
      <h1 data-testid="group-home-title">{group.name}</h1>
      {members.status === 'ready' &&
        activeMine.map((crew) => (
          <Fragment key={crew.id}>
            <CrewPlanSource crew={crew} members={members.data} onTrips={onTrips} />
          </Fragment>
        ))}
      {next && <NextTripCard next={next} names={names} />}
      {!hasProfile && (
        <p data-testid="home-empty-profile">
          {t('groupHome.noProfile')} <Link to="profile">{t('groupHome.setSchedule')}</Link>
        </p>
      )}
      {crews.status === 'ready' && activeMine.length > 0 && !next && <p data-testid="home-no-trips">{t('groupHome.noUpcoming')}</p>}
      {group.destination && (
        <section aria-labelledby="destination-heading">
          <h2 id="destination-heading">{t('group.destination')}</h2>
          <p>{group.destination.label}</p>
          <NavLinks group={group} />
        </section>
      )}
      <section aria-labelledby="my-crews-heading">
        <h2 id="my-crews-heading">{t('groupHome.myCrews')}</h2>
        {crews.status === 'loading' && <LoadingState />}
        {crews.status === 'error' && <p role="alert">{t('common.errorWith', { message: crews.error.message })}</p>}
        {crews.status === 'ready' && mine.length === 0 && (
          <p data-testid="my-crews-empty">
            {t('groupHome.noCrews')} <Link to="crews">{t('groupHome.findCrew')}</Link>
          </p>
        )}
        <ul>
          {mine.map((crew) => (
            <li key={crew.id}>
              <Link to={`crews/${crew.id}`} data-testid="crew-link">
                {crew.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="crews" data-testid="group-home-crews">
          {t('groupHome.allCrews')}
        </Link>
      </section>
    </main>
  );
}
