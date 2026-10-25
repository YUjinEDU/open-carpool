import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AlertCircle, BarChart3, Check, Download } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { useBack } from '../../app/shell/useBack';
import { listTrips, type DateRange } from '../../data/trips';
import type { ChurnStatus } from '../../domain/churn';
import { DEFAULT_TZ, today as todayIn } from '../../domain/dates';
import { moneyFeaturesEnabled } from '../../domain/policies';
import type { Crew, Group, Member } from '../../domain/types';
import { useLoad } from '../../shared/lib/loadable';
import { describeError, useAction } from '../../shared/lib/useAction';
import { Badge, Banner, Button, Card, CardHeader, EmptyState, List, ListItem, Select, Skeleton, Stat, TopBar, type BadgeVariant } from '../../shared/ui';
import { useCrews } from '../crews/hooks';
import { useMembers } from '../members/hooks';
import { monthCsv } from './exportCsv';
import { CO2_KG_PER_KM, ROAD_FACTOR, crewRows, csvFilename, dashboardRanges, groupStats, monthLabel, monthRange, recentMonths, type CrewTrips, type CsvLabels } from './stats';

const MONTHS_OFFERED = 12;
const STAT_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(10rem,100%),1fr))] gap-x-4 gap-y-6';
const CHURN_BADGE: Record<ChurnStatus, BadgeVariant> = { ok: 'success', declining: 'warn', stalled: 'warn' };

/** Crews that run trips; proposals have no trips yet. */
const runningCrews = (crews: readonly Crew[]): Crew[] => crews.filter((c) => c.status !== 'proposed');

const loadCrewTrips = (gid: string, crews: readonly Crew[], ranges: readonly DateRange[]): Promise<CrewTrips[]> =>
  Promise.all(crews.map(async (crew) => ({ crew, trips: (await Promise.all(ranges.map((range) => listTrips(gid, crew.id, range)))).flat() })));

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
  const { t, i18n } = useTranslation();
  const crews = useCrews(group.id);
  const [members, reloadMembers] = useMembers(group.id);
  // Groups carry no time zone yet; the trip planner uses the same default zone.
  const today = todayIn(DEFAULT_TZ);
  const months = useMemo(() => recentMonths(today, MONTHS_OFFERED), [today]);
  // One period for the whole dashboard: the stats, the crew rows and the CSV all describe this month.
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const running = useMemo(() => (crews.status === 'ready' ? runningCrews(crews.data) : []), [crews]);
  const crewKey = running.map((c) => `${c.id}:${JSON.stringify(c.scores)}`).join(',');
  const [trips, reloadTrips] = useLoad(() => loadCrewTrips(group.id, running, dashboardRanges(month, today)), [group.id, crewKey, today, month]);

  let body: ReactNode;
  if (crews.status === 'error' || members.status === 'error' || trips.status === 'error') {
    const error = crews.status === 'error' ? crews.error : members.status === 'error' ? members.error : trips.status === 'error' ? trips.error : null;
    body = (
      <EmptyState
        icon={<AlertCircle />}
        title={t('dashboard.loadError')}
        description={error ? describeError(error) : undefined}
        action={<Button onClick={() => { reloadMembers(); reloadTrips(); }}>{t('dashboard.retry')}</Button>}
      />
    );
  } else if (crews.status === 'loading' || members.status === 'loading' || trips.status === 'loading') {
    body = <DashboardSkeleton />;
  } else {
    body = <DashboardBody group={group} members={members.data} crews={trips.data} today={today} month={month} />;
  }

  return (
    <>
      <Select label={t('ux2.dashboard.period')} value={month} onChange={(e) => setMonth(e.target.value)} wrapperClassName="sm:max-w-xs" data-testid="admin-period">
        {months.map((m) => (
          <option key={m} value={m}>{monthLabel(m, i18n.language)}</option>
        ))}
      </Select>
      {body}
    </>
  );
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
  /** Trips covering the selected month and the churn window; each card narrows them to what it describes. */
  readonly crews: readonly CrewTrips[];
  readonly today: string;
  readonly month: string;
}

function DashboardBody({ group, members, crews, today, month }: BodyProps) {
  const { t, i18n } = useTranslation();
  const range = useMemo(() => monthRange(month), [month]);
  const label = monthLabel(month, i18n.language);
  const stats = useMemo(() => groupStats({ group, members, crews, range }), [group, members, crews, range]);
  const rows = useMemo(() => crewRows(crews, today, range), [crews, today, range]);
  const number = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }), [i18n.language]);
  const percent = (ratio: number | null): string => (ratio === null ? t('dashboard.none') : t('dashboard.percent', { value: Math.round(ratio * 100) }));
  const assumedHint = stats.estimate ? `${t('dashboard.assumed')} *` : t('dashboard.estimateUnavailable');

  return (
    <>
      <Card as="section" padding="lg" aria-labelledby="admin-stats-heading">
        <CardHeader as="h2" title={<span id="admin-stats-heading">{t('ux2.dashboard.statsTitle')}</span>} description={t('ux2.dashboard.statsDescription', { month: label })} />
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
          <CardHeader className="p-5 pb-3" title={t('dashboard.crewsTitle')} description={t('ux2.dashboard.crewsDescription', { month: label })} />
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
        <ExportCard group={group} members={members} crews={crews.map((c) => c.crew)} month={month} label={label} />
      </div>
    </>
  );
}

interface ExportProps {
  readonly group: Group;
  readonly members: readonly Member[];
  /** The crews to export; their trips are read again when the button is pressed. */
  readonly crews: readonly Crew[];
  readonly month: string;
  /** The month as the reader says it ("2026년 10월"). */
  readonly label: string;
}

function ExportCard({ group, members, crews, month, label }: ExportProps) {
  const { t } = useTranslation();
  const [exported, setExported] = useState<string | null>(null);
  const money = moneyFeaturesEnabled(group);
  const { busy, run } = useAction(async () => {
    // The institution reads the file: legs and statuses are the screen's words, not the stored enums.
    const labels: CsvLabels = {
      columns: {
        date: t('ux2.dashboard.csv.date'),
        leg: t('ux2.dashboard.csv.leg'),
        crew: t('ux2.dashboard.csv.crew'),
        driver: t('ux2.dashboard.csv.driver'),
        riders: t('ux2.dashboard.csv.riders'),
        absent: t('ux2.dashboard.csv.absent'),
        status: t('ux2.dashboard.csv.status'),
        completedBy: t('ux2.dashboard.csv.completedBy'),
        completedAt: t('ux2.dashboard.csv.completedAt'),
        cost: t('ux2.dashboard.csv.cost'),
        currency: t('ux2.dashboard.csv.currency'),
      },
      leg: { out: t('trip.leg.out'), back: t('trip.leg.back') },
      status: { planned: t('trip.status.planned'), needs_driver: t('trip.status.needs_driver'), done: t('trip.status.done'), cancelled: t('trip.status.cancelled') },
    };
    const csv = await monthCsv({ load: (ranges) => loadCrewTrips(group.id, crews, ranges), month, members, moneyEnabled: money, labels });
    downloadText(csv, csvFilename(group.name, month));
    setExported(month);
  });

  return (
    <Card as="section" padding="lg" aria-label={t('dashboard.export.title')}>
      <CardHeader
        title={t('dashboard.export.title')}
        description={t('ux2.dashboard.exportDescription', { month: label, cost: money ? t('ux2.dashboard.exportCostColumns') : '' })}
        action={exported === month && <Badge variant="success" icon={<Check />} className="mr-2 mt-1">{t('dashboard.export.done')}</Badge>}
      />
      <div className="mt-4 flex flex-col gap-4">
        <Button fullWidth leadingIcon={<Download />} loading={busy} loadingLabel={t('dashboard.export.busy')} onClick={() => run()} data-testid="admin-csv">
          {t('dashboard.export.button')}
        </Button>
      </div>
    </Card>
  );
}
