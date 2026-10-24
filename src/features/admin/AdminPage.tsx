import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AlertCircle, BarChart3, Check, Download } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { useBack } from '../../app/shell/useBack';
import { listTrips } from '../../data/trips';
import type { ChurnStatus } from '../../domain/churn';
import { DEFAULT_TZ, today as todayIn } from '../../domain/dates';
import { moneyFeaturesEnabled } from '../../domain/policies';
import type { Crew, Group, Member } from '../../domain/types';
import { useLoad } from '../../shared/lib/loadable';
import { describeError, useAction } from '../../shared/lib/useAction';
import { Badge, Banner, Button, Card, CardHeader, EmptyState, List, ListItem, Select, Skeleton, Stat, TopBar, type BadgeVariant } from '../../shared/ui';
import { useCrews } from '../crews/hooks';
import { useMembers } from '../members/hooks';
import { CO2_KG_PER_KM, ROAD_FACTOR, crewRows, csvFilename, groupStats, monthRange, recentMonths, statsRange, tripsCsv, type CrewTrips } from './stats';

const MONTHS_OFFERED = 12;
const STAT_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(10rem,100%),1fr))] gap-x-4 gap-y-6';
const CHURN_BADGE: Record<ChurnStatus, BadgeVariant> = { ok: 'success', declining: 'warn', stalled: 'warn' };

/** Crews that run trips; proposals have no trips yet. */
const runningCrews = (crews: readonly Crew[]): Crew[] => crews.filter((c) => c.status !== 'proposed');

const loadCrewTrips = (gid: string, crews: readonly Crew[], range: { from: string; to: string }): Promise<CrewTrips[]> =>
  Promise.all(crews.map(async (crew) => ({ crew, trips: await listTrips(gid, crew.id, range) })));

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `/g/:gid/admin`: group numbers for the institution and the monthly CSV. Admins only. */
export function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { group, isAdmin } = useGroup();
  const back = useBack(`/g/${group.id}`);
  return (
    <>
      <TopBar wide title={t('dashboard.title')} onBack={back} backLabel={t('nav.back')} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-4 pb-safe-nav">
        {isAdmin ? (
          <Dashboard group={group} />
        ) : (
          <Banner
            variant="warn"
            title={t('dashboard.forbiddenTitle')}
            action={<Button variant="secondary" onClick={() => navigate(`/g/${group.id}`)}>{t('dashboard.backToGroup')}</Button>}
          >
            {t('dashboard.forbiddenBody')}
          </Banner>
        )}
      </main>
    </>
  );
}

function Dashboard({ group }: { readonly group: Group }) {
  const { t } = useTranslation();
  const crews = useCrews(group.id);
  const [members, reloadMembers] = useMembers(group.id);
  // Groups carry no time zone yet; the trip planner uses the same default zone.
  const today = todayIn(DEFAULT_TZ);
  const running = useMemo(() => (crews.status === 'ready' ? runningCrews(crews.data) : []), [crews]);
  const crewKey = running.map((c) => `${c.id}:${JSON.stringify(c.scores)}`).join(',');
  const [trips, reloadTrips] = useLoad(() => loadCrewTrips(group.id, running, statsRange(today)), [group.id, crewKey, today]);

  if (crews.status === 'error' || members.status === 'error' || trips.status === 'error') {
    const error = crews.status === 'error' ? crews.error : members.status === 'error' ? members.error : trips.status === 'error' ? trips.error : null;
    return (
      <EmptyState
        icon={<AlertCircle />}
        title={t('dashboard.loadError')}
        description={error ? describeError(error) : undefined}
        action={<Button onClick={() => { reloadMembers(); reloadTrips(); }}>{t('dashboard.retry')}</Button>}
      />
    );
  }
  if (crews.status === 'loading' || members.status === 'loading' || trips.status === 'loading') return <DashboardSkeleton />;
  return <DashboardBody group={group} members={members.data} crews={trips.data} today={today} />;
}

function DashboardSkeleton() {
  return (
    <Card padding="lg">
      <div className={STAT_GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton variant="text" className="w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

interface BodyProps {
  readonly group: Group;
  readonly members: readonly Member[];
  readonly crews: readonly CrewTrips[];
  readonly today: string;
}

function DashboardBody({ group, members, crews, today }: BodyProps) {
  const { t, i18n } = useTranslation();
  const stats = useMemo(() => groupStats({ group, members, crews, today }), [group, members, crews, today]);
  const rows = useMemo(() => crewRows(crews, today), [crews, today]);
  const number = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }), [i18n.language]);
  const percent = (ratio: number | null): string => (ratio === null ? t('dashboard.none') : t('dashboard.percent', { value: Math.round(ratio * 100) }));
  const assumedHint = stats.estimate ? `${t('dashboard.assumed')} *` : t('dashboard.estimateUnavailable');

  return (
    <>
      <Card as="section" padding="lg" aria-labelledby="admin-stats-heading">
        <CardHeader as="h2" title={<span id="admin-stats-heading">{t('dashboard.window')}</span>} />
        <div className={`mt-5 ${STAT_GRID}`} data-testid="admin-stats">
          <Stat size="lg" value={percent(stats.participationRate)} label={t('dashboard.stats.participation')} />
          <Stat size="lg" value={number.format(stats.tripsDone)} label={t('dashboard.stats.trips')} />
          <Stat size="lg" value={percent(stats.seatsFilled)} label={t('dashboard.stats.seats')} />
          <Stat size="lg" value={number.format(stats.activeMembers)} label={t('dashboard.stats.members')} />
          <Stat size="lg" value={number.format(stats.activeCrews)} label={t('dashboard.stats.crews')} />
          <Stat
            size="lg"
            value={stats.estimate ? t('dashboard.km', { value: number.format(stats.estimate.distanceKm) }) : t('dashboard.none')}
            label={t('dashboard.stats.distance')}
            hint={assumedHint}
          />
          <Stat
            size="lg"
            value={stats.estimate ? t('dashboard.kg', { value: number.format(stats.estimate.co2Kg) }) : t('dashboard.none')}
            label={t('dashboard.stats.co2')}
            hint={assumedHint}
          />
        </div>
        {stats.estimate && (
          <p className="mt-6 text-caption text-ink-3" data-testid="admin-estimate-footnote">
            * {t('dashboard.footnote', { factor: ROAD_FACTOR, co2: CO2_KG_PER_KM })}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))] items-start gap-6">
        <Card as="section" padding="none" aria-label={t('dashboard.crewsTitle')}>
          <CardHeader className="p-5 pb-3" title={t('dashboard.crewsTitle')} description={t('dashboard.crewsDescription')} />
          {rows.length === 0 ? (
            <EmptyState compact icon={<BarChart3 />} title={t('dashboard.crewsEmpty')} />
          ) : (
            <List inset={false} className="border-t border-line">
              {rows.map((row) => (
                <ListItem
                  key={row.crew.id}
                  title={<span data-testid={`admin-crew-${row.crew.id}`}>{row.crew.name}</span>}
                  description={t('dashboard.crewLine', { trips: row.tripsDone, spread: number.format(row.ledgerSpread) })}
                  trailing={<Badge variant={CHURN_BADGE[row.churn]}>{t(`dashboard.churn.${row.churn}`)}</Badge>}
                />
              ))}
            </List>
          )}
          {stats.tripsDone === 0 && rows.length > 0 && (
            <EmptyState compact className="border-t border-line" title={t('dashboard.empty')} description={t('dashboard.emptyHint')} />
          )}
        </Card>
        <ExportCard group={group} members={members} crews={crews} today={today} />
      </div>
    </>
  );
}

function ExportCard({ group, members, crews, today }: BodyProps) {
  const { t, i18n } = useTranslation();
  const months = useMemo(() => recentMonths(today, MONTHS_OFFERED), [today]);
  const [month, setMonth] = useState(months[0] ?? today.slice(0, 7));
  const [exported, setExported] = useState<string | null>(null);
  const money = moneyFeaturesEnabled(group);
  // "2026년 10월" / "October 2026" instead of the raw YYYY-MM value.
  const monthLabel = useMemo(() => {
    const format = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long', timeZone: 'UTC' });
    return (ym: string) => format.format(new Date(`${ym}-01T00:00:00Z`));
  }, [i18n.language]);
  const exportMonth = useCallback(async () => {
    const monthTrips = await loadCrewTrips(group.id, crews.map((c) => c.crew), monthRange(month));
    downloadText(tripsCsv({ crews: monthTrips, members, moneyEnabled: money }), csvFilename(group.name, month));
    setExported(month);
  }, [group, crews, members, money, month]);
  const { busy, run } = useAction(exportMonth);

  return (
    <Card as="section" padding="lg" aria-label={t('dashboard.export.title')}>
      <CardHeader
        title={t('dashboard.export.title')}
        description={t('dashboard.export.description', { cost: money ? t('dashboard.export.costColumns') : '' })}
        action={exported === month && <Badge variant="success" icon={<Check />} className="mr-2 mt-1">{t('dashboard.export.done')}</Badge>}
      />
      <div className="mt-4 flex flex-col gap-4">
        <Select label={t('dashboard.export.month')} value={month} onChange={(e) => setMonth(e.target.value)} data-testid="admin-csv-month">
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </Select>
        <Button fullWidth leadingIcon={<Download />} loading={busy} loadingLabel={t('dashboard.export.busy')} onClick={() => run()} data-testid="admin-csv">
          {t('dashboard.export.button')}
        </Button>
      </div>
    </Card>
  );
}
