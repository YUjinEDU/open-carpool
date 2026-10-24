import { Fragment, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CalendarClock, Check, ChevronRight, Moon, Share2, Users } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { DIGEST_HOUR, useDigestNotification, type Digest } from '../../app/notifications';
import { useGroup } from '../../app/providers/group';
import { GroupSwitcherSheet } from '../../app/shell/GroupSwitcherSheet';
import { InviteSheet } from '../../app/shell/InviteShare';
import { PageBody } from '../../app/shell/PageBody';
import { addDays, today, zonedDateHour } from '../../domain/dates';
import type { Crew, Member, Trip } from '../../domain/types';
import { joinNames } from '../../shared/lib/format';
import { AvatarStack, Badge, Banner, Button, Card, CardHeader, EmptyState, IconButton, List, ListItem, Skeleton, TopBar } from '../../shared/ui';
import { useCrews } from '../crews/hooks';
import { NavLinks } from '../map/NavLinks';
import { useMembers } from '../members/hooks';
import { DayCell } from '../trips/DayCell';
import { GROUP_TZ, useCrewPlan } from '../trips/hooks';
import { NextTripCard } from '../trips/NextTripCard';
import { compareTrips, legTime, pickNextTrip, type CrewTrip } from '../trips/nextTrip';
import { TripStatusBadge } from '../trips/TripStatusBadge';

type TripsByCrew = Readonly<Record<string, readonly Trip[]>>;
const WEEK_ROWS = 5;

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

const crewStatusBadge = (status: Crew['status'], t: TFunction) =>
  status === 'active' ? (
    <Badge variant="success" icon={<Check />}>{t('crews.status.active')}</Badge>
  ) : status === 'proposed' ? (
    <Badge variant="info">{t('crews.status.proposed')}</Badge>
  ) : (
    <Badge>{t('crews.status.paused')}</Badge>
  );

/** Group home: tonight's answer in one glance, this week, my crews. */
export function GroupHomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group, me } = useGroup();
  const crews = useCrews(group.id);
  const [members, reloadMembers] = useMembers(group.id);
  const [tripsByCrew, setTripsByCrew] = useState<TripsByCrew>({});
  const [switcher, setSwitcher] = useState(false);
  const [invite, setInvite] = useState(false);
  const [digestDismissed, setDigestDismissed] = useState(false);
  const onTrips = useCallback((cid: string, trips: readonly Trip[]) => setTripsByCrew((prev) => ({ ...prev, [cid]: trips })), []);

  const mine = useMemo(() => (crews.status === 'ready' ? crews.data.filter((c) => c.memberIds.includes(me.uid)) : []), [crews, me.uid]);
  const activeMine = useMemo(() => mine.filter((c) => c.status === 'active'), [mine]);
  const activeMembers = useMemo(() => (members.status === 'ready' ? members.data.filter((m) => m.status === 'active') : []), [members]);
  const names = useMemo(() => new Map(activeMembers.map((m) => [m.uid, m.displayName])), [activeMembers]);
  const name = (uid: string) => names.get(uid) ?? uid;
  const now = new Date();
  const local = zonedDateHour(now, GROUP_TZ);
  const todayDate = local.date;
  const tomorrow = addDays(todayDate, 1);

  const allMine: CrewTrip[] = useMemo(
    () => activeMine.flatMap((crew) => (tripsByCrew[crew.id] ?? []).map((trip) => ({ crew, trip }))),
    [activeMine, tripsByCrew],
  );
  const next = pickNextTrip(allMine, me.uid, todayDate);
  const week = useMemo(
    () =>
      allMine
        .filter(({ trip }) => trip.date >= todayDate && trip.status !== 'cancelled')
        .sort((a, b) => compareTrips(a.trip, b.trip) || legTime(a.crew, a.trip.leg).localeCompare(legTime(b.crew, b.trip.leg)))
        .slice(0, WEEK_ROWS),
    [allMine, todayDate],
  );
  const tomorrowTrips = useMemo(() => allMine.filter(({ trip }) => trip.date === tomorrow && (trip.status === 'planned' || trip.status === 'needs_driver')), [allMine, tomorrow]);
  const digest = useMemo<Digest | null>(() => {
    if (tomorrowTrips.length === 0) return null;
    const lines = tomorrowTrips.map(({ crew, trip }) =>
      t('groupHome.digestLine', {
        crew: crew.name,
        time: legTime(crew, trip.leg),
        driver: trip.driverId ? name(trip.driverId) : t('groupHome.digestDriverNeeded'),
        riders: trip.riderIds.length > 0 ? joinNames(trip.riderIds.map(name)) : t('groupHome.digestNoRiders'),
      }),
    );
    return { title: t('groupHome.digestTitle'), body: [...lines, t('groupHome.digestCutoff', { hour: group.policy.absenceCutoffHour })].join('\n') };
    // names is derived from members; t changes with the locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tomorrowTrips, names, group.policy.absenceCutoffHour, t]);
  useDigestNotification(digest, GROUP_TZ);
  const showDigest = digest !== null && local.hour >= DIGEST_HOUR && !digestDismissed;

  const hasProfile = Object.keys(me.schedule).length > 0;
  const isOwner = me.role === 'owner';
  const gettingStarted = isOwner && crews.status === 'ready' && mine.length === 0 && members.status === 'ready' && activeMembers.length <= 1;
  const loading = crews.status === 'loading' || members.status === 'loading';
  const go = (href: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(href);
  };
  const crewsHref = `/g/${group.id}/crews`;

  return (
    <>
      <TopBar
        title={<span data-testid="group-home-title">{group.name}</span>}
        onTitleClick={() => setSwitcher(true)}
        titleActionLabel={t('nav.switchGroup')}
        trailing={<IconButton label={t('invite.open')} icon={<Share2 />} onClick={() => setInvite(true)} data-testid="home-invite" />}
      />
      <PageBody nav>
        {members.status === 'ready' &&
          activeMine.map((crew) => (
            <Fragment key={crew.id}>
              <CrewPlanSource crew={crew} members={members.data} onTrips={onTrips} />
            </Fragment>
          ))}

        {showDigest && digest && (
          <Banner variant="info" icon={<Moon />} title={digest.title} onDismiss={() => setDigestDismissed(true)} dismissLabel={t('common.dismiss')} data-testid="digest-banner">
            {digest.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </Banner>
        )}

        {!hasProfile && (
          <Banner
            variant="info"
            icon={<CalendarClock />}
            data-testid="home-empty-profile"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate(`/g/${group.id}/profile`)}>
                {t('groupHome.setSchedule')}
              </Button>
            }
          >
            {t('groupHome.noProfile')}
          </Banner>
        )}

        {crews.status === 'error' && <ErrorBanner error={crews.error} onRetry={() => window.location.reload()} />}
        {members.status === 'error' && <ErrorBanner error={members.error} onRetry={reloadMembers} />}

        {loading && (
          <Card variant="inverse" padding="lg" className="flex flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-4 w-1/3 bg-surface-3" />
            <Skeleton className="h-8 w-3/4 bg-surface-3" />
            <Skeleton className="h-11 bg-surface-3" />
          </Card>
        )}

        {!loading && next && <NextTripCard next={next} names={names} />}

        {!loading && crews.status === 'ready' && activeMine.length > 0 && !next && (
          <Card variant="inverse" padding="lg" as="section" data-testid="home-no-trips">
            <p className="text-sub font-medium text-ink-2">{t('groupHome.upcoming')}</p>
            <p className="mt-1 text-title-1 text-ink">{t('groupHome.noUpcoming')}</p>
            <p className="mt-1 text-sub text-ink-2">{t('groupHome.noUpcomingHint')}</p>
          </Card>
        )}

        {gettingStarted && (
          <Card variant="tonal" as="section">
            <CardHeader title={t('groupHome.gettingStarted')} description={t('groupHome.gettingStartedHint')} />
            <List inset={false} className="-mx-4 mt-2">
              <ListItem title={t('groupHome.stepInvite')} onClick={() => setInvite(true)} chevron />
              <ListItem title={t('groupHome.stepSchedule')} href={`/g/${group.id}/profile`} onClick={go(`/g/${group.id}/profile`)} trailing={hasProfile ? <Check aria-hidden="true" className="size-5 text-success-ink" /> : undefined} />
              <ListItem title={t('groupHome.stepCrew')} href={crewsHref} onClick={go(crewsHref)} />
            </List>
          </Card>
        )}

        {!loading && crews.status === 'ready' && mine.length === 0 && !gettingStarted && (
          <Card variant="tonal" padding="none">
            <EmptyState
              icon={<Users />}
              title={t('groupHome.noCrews')}
              description={t('groupHome.noCrewsHint')}
              data-testid="my-crews-empty"
              action={<Button onClick={() => navigate(crewsHref)}>{t('groupHome.proposeCrew')}</Button>}
            />
          </Card>
        )}

        {week.length > 0 && (
          <Card padding="none" as="section">
            <CardHeader
              className="px-4 pt-4"
              title={t('groupHome.thisWeek')}
              description={activeMine.length === 1 ? activeMine[0].name : undefined}
            />
            <List inset={false} className="mt-2">
              {week.map(({ crew, trip }) => (
                <ListItem
                  key={`${crew.id}-${trip.id}`}
                  leading={<DayCell date={trip.date} locale={i18n.language} highlight={next?.trip.id === trip.id && next.crew.id === crew.id} />}
                  title={trip.driverId ? `${name(trip.driverId)} ${t('trip.driveSuffix')}` : t('trip.driverNeeded')}
                  description={`${t(trip.leg === 'out' ? 'groupHome.departs' : 'groupHome.returns', { time: legTime(crew, trip.leg) })}${activeMine.length > 1 ? ` · ${crew.name}` : ''}`}
                  trailing={<TripStatusBadge trip={trip} meUid={me.uid} />}
                  href={`/g/${group.id}/crews/${crew.id}`}
                  onClick={go(`/g/${group.id}/crews/${crew.id}`)}
                />
              ))}
            </List>
          </Card>
        )}

        {crews.status === 'ready' && mine.length > 0 && (
          <Card padding="none" as="section">
            <CardHeader
              className="px-4 pt-4"
              title={t('groupHome.myCrews')}
              action={
                <Button variant="ghost" size="sm" trailingIcon={<ChevronRight />} onClick={() => navigate(crewsHref)} data-testid="group-home-crews">
                  {t('groupHome.allCrews')}
                </Button>
              }
            />
            <List inset={false} className="mt-2">
              {mine.map((crew) => (
                <ListItem
                  key={crew.id}
                  leading={<AvatarStack people={crew.memberIds.map((uid) => ({ name: name(uid) }))} size="sm" max={3} />}
                  title={crew.name}
                  description={`${t('groupHome.memberCount', { count: crew.memberIds.length })} · ${t('groupHome.captain', { name: name(crew.captainId) })}`}
                  trailing={crewStatusBadge(crew.status, t)}
                  href={`/g/${group.id}/crews/${crew.id}`}
                  onClick={go(`/g/${group.id}/crews/${crew.id}`)}
                  data-testid="crew-link"
                />
              ))}
            </List>
          </Card>
        )}

        {group.destination && (
          <Card as="section">
            <CardHeader title={t('groupHome.destination')} description={group.destination.label} />
            <div className="mt-3">
              <NavLinks group={group} />
            </div>
          </Card>
        )}
      </PageBody>
      <GroupSwitcherSheet open={switcher} onClose={() => setSwitcher(false)} current={group} />
      <InviteSheet open={invite} onClose={() => setInvite(false)} group={group} />
    </>
  );
}
