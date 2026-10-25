import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { Car, Check, Pause, Pencil, Play, Share2, UserX } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { PageBody } from '../../app/shell/PageBody';
import { useBack } from '../../app/shell/useBack';
import { setCrewStatus, withdrawCrew } from '../../data/crews';
import { detectChurn } from '../../domain/churn';
import { today } from '../../domain/dates';
import { pickDriver, scoreInRides } from '../../domain/rotation';
import type { Crew, Member, Trip } from '../../domain/types';
import { formatDate, joinNames } from '../../shared/lib/format';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Badge, Banner, Button, Card, CardHeader, Dialog, EmptyState, LedgerBar, List, ListItem, Sheet, Skeleton, Stat, TopBar, copyText, showToast } from '../../shared/ui';
import { LegalNotice } from '../groups/LegalNotice';
import { NavLinks } from '../map/NavLinks';
import { useMembers } from '../members/hooks';
import { GROUP_TZ, useCrewPlan } from '../trips/hooks';
import { compareTrips, legTime } from '../trips/nextTrip';
import { TripCard } from '../trips/TripCard';
import { CrewForm } from './CrewForm';
import { useCrews } from './hooks';
import { tripStats, useCrewHistory } from './useCrewHistory';
import { useProposalActions } from './useProposalActions';
import { weekdayRange } from '../profile/schedule';

/** `/g/:gid/crews/:cid`: members, ledger and this week's plan. */
export function CrewPage() {
  const { t } = useTranslation();
  const { cid = '' } = useParams();
  const { group } = useGroup();
  const back = useBack(`/g/${group.id}/crews`);
  const crews = useCrews(group.id);
  const [members, reloadMembers] = useMembers(group.id);

  if (crews.status === 'loading' || members.status === 'loading') {
    return (
      <>
        <TopBar title={<Skeleton className="h-5 w-32" />} onBack={back} backLabel={t('nav.back')} />
        <PageBody nav>
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </PageBody>
      </>
    );
  }
  if (crews.status === 'error' || members.status === 'error') {
    return (
      <>
        <TopBar title={t('crew.title')} onBack={back} backLabel={t('nav.back')} />
        <PageBody nav>
          {crews.status === 'error' && <ErrorBanner error={crews.error} onRetry={crews.retry} />}
          {members.status === 'error' && <ErrorBanner error={members.error} onRetry={reloadMembers} />}
        </PageBody>
      </>
    );
  }
  const crew = crews.data.find((c) => c.id === cid);
  if (!crew) {
    return (
      <>
        <TopBar title={t('crew.title')} onBack={back} backLabel={t('nav.back')} />
        <PageBody nav>
          <EmptyState icon={<UserX />} title={t('crew.notFound')} action={<Button variant="secondary" onClick={back}>{t('nav.crews')}</Button>} />
        </PageBody>
      </>
    );
  }
  return <CrewDetail crew={crew} members={members.data} onBack={back} />;
}

interface LedgerRowView {
  readonly uid: string;
  readonly name: string;
  readonly rides: number;
  readonly label: string;
  readonly canDrive: boolean;
}

const roundRides = (units: number): number => Math.round(scoreInRides(units) * 100) / 100;

function CrewDetail({ crew, members, onBack }: { readonly crew: Crew; readonly members: readonly Member[]; readonly onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group, me, isAdmin } = useGroup();
  const trips = useCrewPlan(crew, members);
  const todayDate = today(GROUP_TZ);
  const past = useCrewHistory(group.id, crew.id, todayDate);
  const memberById = useMemo(() => new Map(members.map((m) => [m.uid, m])), [members]);
  const names = useMemo(() => new Map(members.map((m) => [m.uid, m.displayName])), [members]);
  const name = (uid: string) => names.get(uid) ?? uid;
  const isCaptain = crew.captainId === me.uid;
  const manages = isCaptain || isAdmin;
  const { canRespond, accept, decline } = useProposalActions(crew);
  const [declining, setDeclining] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [editing, setEditing] = useState(false);
  const closeDecline = () => {
    setDeclining(false);
    decline.clearError();
  };
  // A proposal that never ran can be withdrawn (deleted); one with ledger history cannot (rules).
  const canWithdraw = manages && crew.status === 'proposed' && Object.keys(crew.lastDroveOn).length === 0;
  const withdraw = useAction(async () => {
    await withdrawCrew(group.id, crew.id);
    setWithdrawing(false);
    showToast(t('crews.withdrawn'), 'info');
    navigate(`/g/${group.id}/crews`, { replace: true });
  }, { report: 'inline' });
  const pause = useAction(async () => {
    await setCrewStatus(group.id, crew.id, 'paused');
    setPausing(false);
    showToast(t('crews.paused'), 'info');
  }, { report: 'inline' });
  const resume = useAction(async () => {
    await setCrewStatus(group.id, crew.id, 'active');
    showToast(t('crews.resumed'), 'success');
  });

  const pastTrips: readonly Trip[] = past.status === 'ready' ? past.data : [];
  const churn = useMemo(() => detectChurn(pastTrips, crew, todayDate), [pastTrips, crew, todayDate]);
  // A new crew shows "-" rather than 0% (counted is 0).
  const { done: doneCount, counted } = useMemo(() => tripStats(pastTrips, todayDate), [pastTrips, todayDate]);
  const droveCount = (uid: string) => pastTrips.filter((trip) => trip.status === 'done' && trip.driverId === uid).length;

  const ledger: readonly LedgerRowView[] = useMemo(
    () =>
      crew.memberIds
        .map((uid) => {
          const rides = roundRides(crew.scores[uid] ?? 0);
          const label = rides > 0 ? t('crew.ledgerAhead', { rides }) : rides < 0 ? t('crew.ledgerBehind', { rides }) : t('crew.ledgerZero');
          return { uid, name: name(uid), rides, label, canDrive: memberById.get(uid)?.canDrive === true };
        })
        .sort((a, b) => b.rides - a.rides),
    // names and memberById derive from members
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crew, members, t],
  );
  const ledgerMax = Math.max(1, Math.ceil(Math.max(0, ...ledger.map((row) => Math.abs(row.rides)))));
  const nextDriver = pickDriver({
    present: crew.memberIds.filter((uid) => memberById.get(uid)?.status === 'active'),
    eligible: crew.memberIds.filter((uid) => memberById.get(uid)?.canDrive === true),
    scores: crew.scores,
    lastDroveOn: crew.lastDroveOn,
  });
  const hasRecords = pastTrips.some((trip) => trip.status === 'done') || Object.values(crew.scores).some((units) => units !== 0);

  const sortedWeek = trips.status === 'ready' ? [...trips.data].sort(compareTrips) : [];
  const shareWeek = async () => {
    const lines = sortedWeek
      .filter((trip) => trip.status !== 'cancelled')
      .map((trip) =>
        t('crew.shareLine', {
          date: formatDate(trip.date, i18n.language),
          time: legTime(crew, trip.leg),
          driver: trip.driverId ? name(trip.driverId) : t('trip.driverNeeded'),
          riders: trip.riderIds.length > 0 ? joinNames(trip.riderIds.map(name)) : t('trip.noRiders'),
        }),
      );
    const title = t('crew.shareWeekTitle', { crew: crew.name });
    const text = [title, ...(lines.length > 0 ? lines : [t('crew.shareNoTrips')])].join('\n');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        /* dismissed: fall back to copying */
      }
    }
    if (await copyText(text)) showToast(t('crew.shareCopied'), 'success');
  };

  const facts = [
    { key: 'days', label: t('crew.factDays'), value: weekdayRange(crew.days, i18n.language) },
    crew.outTime && { key: 'out', label: t('crew.factOut'), value: crew.outTime },
    crew.backTime && { key: 'back', label: t('crew.factBack'), value: crew.backTime },
    crew.pickupNote && { key: 'pickup', label: t('crew.factPickup'), value: crew.pickupNote },
    { key: 'wait', label: t('crew.factWait'), value: t('crew.waitMin', { min: crew.waitLimitMin }) },
  ].filter((f): f is { key: string; label: string; value: string } => Boolean(f));

  const statusBadge =
    crew.status === 'active' ? (
      <Badge variant="success" icon={<Check />} data-testid="crew-status">{t('crews.status.active')}</Badge>
    ) : crew.status === 'proposed' ? (
      <Badge variant="info" data-testid="crew-status">{t('crews.status.proposed')}</Badge>
    ) : (
      <Badge data-testid="crew-status">{t('crews.status.paused')}</Badge>
    );

  return (
    <>
      <TopBar title={<span data-testid="crew-title">{crew.name}</span>} onBack={onBack} backLabel={t('nav.back')} />
      <PageBody nav>
        <div className="flex flex-wrap items-center gap-2 px-1 text-sub text-ink-2">
          {statusBadge}
          <span>
            {t('groupHome.memberCount', { count: crew.memberIds.length })} · {t('groupHome.captain', { name: name(crew.captainId) })}
          </span>
        </div>

        {crew.status === 'proposed' && (
          <Banner
            variant="info"
            title={t('crews.proposedBanner')}
            action={
              canRespond ? (
                <span className="flex flex-wrap gap-2">
                  <Button loading={accept.busy} loadingLabel={t('crews.accepting')} onClick={() => accept.run()} data-testid="crew-accept">
                    {t('crews.accept')}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeclining(true)} data-testid="crew-decline">
                    {t('crews.decline')}
                  </Button>
                </span>
              ) : canWithdraw ? (
                <Button variant="ghost" onClick={() => setWithdrawing(true)} data-testid="crew-withdraw">
                  {t('crews.withdraw')}
                </Button>
              ) : undefined
            }
          >
            {!canRespond && t('crews.proposedWaiting')}
          </Banner>
        )}

        {isCaptain && churn.status !== 'ok' && (
          <Banner
            variant="warn"
            title={t('crew.churnTitle')}
            data-testid="churn-banner"
            action={
              <Button variant="secondary" onClick={() => navigate(`/g/${group.id}/crews`)}>
                {t('crew.churnAction')}
              </Button>
            }
          >
            <p>
              {churn.status === 'stalled'
                ? t('crew.churnStalled')
                : t('crew.churnDeclining', { recent: Math.round(churn.recentRate * 100), previous: Math.round(churn.previousRate * 100) })}
            </p>
            {churn.membersAtRisk.length > 0 && <p>{t('crew.churnAtRisk', { names: joinNames(churn.membersAtRisk.map(name)) })}</p>}
          </Banner>
        )}

        <Card as="section" padding="none">
          <CardHeader className="px-4 pt-4" title={t('crew.ledger')} />
          <div className="mt-1 divide-y divide-line px-4">
            {ledger.map((row) => {
              const isNext = row.uid === nextDriver;
              const detail = isNext
                ? t('crew.drivesNext')
                : !row.canDrive
                  ? t('crew.noDrive')
                  : !hasRecords
                    ? t('crew.noRecords')
                    : t('crew.droveCount', { count: droveCount(row.uid) });
              return (
                <LedgerBar
                  key={row.uid}
                  name={row.uid === me.uid ? `${row.name} (${t('common.me')})` : row.name}
                  value={row.rides}
                  max={ledgerMax}
                  label={row.label}
                  leading={<Avatar name={row.name} size="md" marker={isNext ? <Car /> : undefined} />}
                  detail={detail}
                  highlight={isNext}
                  data-testid={`ledger-row-${row.uid}`}
                />
              );
            })}
          </div>
          <p className="px-4 pb-4 pt-3 text-caption text-ink-3">{t('crew.ledgerHint')}</p>
        </Card>

        <Card as="section">
          <div className="grid grid-cols-3 gap-3">
            <Stat value={past.status === 'ready' ? doneCount : <Skeleton className="h-7 w-10" />} label={t('crew.statTrips')} />
            <Stat
              value={past.status === 'ready' ? (counted === 0 ? t('crew.statNone') : `${Math.round((doneCount / counted) * 100)}%`) : <Skeleton className="h-7 w-10" />}
              label={t('crew.statRate')}
              hint={t('crew.statRateHint')}
              data-testid="crew-stat-rate"
            />
            <Stat value={crew.memberIds.length} label={t('crew.statMembers')} />
          </div>
        </Card>

        <Card as="section" padding="none">
          <CardHeader
            className="px-4 pt-4"
            title={t('crew.week')}
            action={
              <Button variant="ghost" size="sm" leadingIcon={<Share2 />} onClick={() => void shareWeek()} data-testid="crew-share-week">
                {t('common.share')}
              </Button>
            }
          />
          {crew.status === 'proposed' && <p className="px-4 pb-4 pt-2 text-sub text-ink-2">{t('crew.notActive')}</p>}
          {crew.status === 'paused' && <p className="px-4 pb-4 pt-2 text-sub text-ink-2">{t('crew.pausedNote')}</p>}
          {crew.status === 'active' && trips.status === 'loading' && (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          )}
          {crew.status === 'active' && trips.status === 'error' && <ErrorBanner error={trips.error} onRetry={trips.retry} className="m-4" />}
          {crew.status === 'active' && trips.status === 'ready' && sortedWeek.length === 0 && <EmptyState compact title={t('crew.noTrips')} />}
          {crew.status === 'active' && trips.status === 'ready' && sortedWeek.length > 0 && (
            <ul role="list" className="mt-1 divide-y divide-line">
              {sortedWeek.map((trip) => (
                <TripCard key={trip.id} crew={crew} trip={trip} names={names} members={members} highlight={trip.date === todayDate} />
              ))}
            </ul>
          )}
        </Card>

        <Card as="section" padding="none">
          <CardHeader className="px-4 pt-4" title={t('crew.members')} />
          <List inset={false} className="mt-1">
            {crew.memberIds.map((uid) => {
              const member = memberById.get(uid);
              const badge =
                uid === crew.captainId ? (
                  <Badge variant="brand">{t('crew.captain')}</Badge>
                ) : crew.status === 'proposed' && !crew.acceptedIds.includes(uid) ? (
                  <Badge variant="info">{t('crews.pending')}</Badge>
                ) : crew.backupDriverIds.includes(uid) ? (
                  <Badge>{t('crew.backup')}</Badge>
                ) : undefined;
              return (
                <ListItem
                  key={uid}
                  leading={<Avatar name={name(uid)} size="md" />}
                  title={uid === me.uid ? `${name(uid)} (${t('common.me')})` : name(uid)}
                  description={member?.canDrive ? t('crew.driverSeats', { seats: member.seats }) : t('crew.riderOnly')}
                  trailing={badge}
                />
              );
            })}
          </List>
        </Card>

        <Card as="section" variant="tonal" padding="none">
          <CardHeader
            className="px-4 pt-4"
            title={t('crew.facts')}
            action={
              manages ? (
                <Button variant="ghost" size="sm" leadingIcon={<Pencil />} onClick={() => setEditing(true)} data-testid="crew-edit">
                  {t('crew.edit')}
                </Button>
              ) : undefined
            }
          />
          <List inset={false} className="mt-1">
            {facts.map((fact) => (
              <ListItem key={fact.key} title={<span className="text-sub text-ink-2">{fact.label}</span>} trailing={<span className="text-body text-ink">{fact.value}</span>} className="min-h-12 py-2" />
            ))}
          </List>
          {group.destination && (
            <div className="px-4 pb-4 pt-1">
              <NavLinks group={group} />
            </div>
          )}
        </Card>

        {manages && crew.status === 'active' && (
          <Button variant="ghost" leadingIcon={<Pause />} className="self-start" onClick={() => setPausing(true)} data-testid="crew-pause">
            {t('crews.pause')}
          </Button>
        )}
        {manages && crew.status === 'paused' && (
          <Button variant="secondary" leadingIcon={<Play />} className="self-start" loading={resume.busy} onClick={() => resume.run()} data-testid="crew-resume">
            {t('crews.resume')}
          </Button>
        )}

        <LegalNotice group={group} variant="caption" data-testid="crew-legal-notice" />
      </PageBody>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('crewForm.editTitle')} closeLabel={t('common.close')}>
        {editing && <CrewForm members={members} crew={crew} onDone={() => setEditing(false)} />}
      </Sheet>
      <Dialog
        open={declining}
        onClose={closeDecline}
        role="alertdialog"
        title={t('crews.declineTitle')}
        description={t('crews.declineBody')}
        actions={
          <>
            <Button variant="secondary" onClick={closeDecline}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={decline.busy} loadingLabel={t('crews.declining')} onClick={() => decline.run(() => { closeDecline(); navigate(`/g/${group.id}/crews`, { replace: true }); })} data-testid="crew-decline-confirm">
              {t('crews.declineAction')}
            </Button>
          </>
        }
      >
        {decline.error && <Banner variant="danger">{decline.error}</Banner>}
      </Dialog>
      <Dialog
        open={withdrawing}
        onClose={() => { setWithdrawing(false); withdraw.clearError(); }}
        role="alertdialog"
        title={t('crews.withdrawTitle')}
        description={t('crews.withdrawBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setWithdrawing(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={withdraw.busy} onClick={() => withdraw.run()} data-testid="crew-withdraw-confirm">
              {t('crews.withdrawAction')}
            </Button>
          </>
        }
      >
        {withdraw.error && <Banner variant="danger">{withdraw.error}</Banner>}
      </Dialog>
      <Dialog
        open={pausing}
        onClose={() => { setPausing(false); pause.clearError(); }}
        role="alertdialog"
        title={t('crews.pauseTitle')}
        description={t('crews.pauseBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPausing(false)}>{t('common.cancel')}</Button>
            <Button loading={pause.busy} loadingLabel={t('crews.pausing')} onClick={() => pause.run()} data-testid="crew-pause-confirm">
              {t('crews.pauseAction')}
            </Button>
          </>
        }
      >
        {pause.error && <Banner variant="danger">{pause.error}</Banner>}
      </Dialog>
    </>
  );
}
