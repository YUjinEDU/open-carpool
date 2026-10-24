import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { BarChart3, CalendarDays, CircleUserRound, Home, LayoutGrid, LogOut, Menu, Settings, UserRound, Users } from 'lucide-react';
import { leaveGroup } from '../../data/members';
import { addDays, today } from '../../domain/dates';
import { useCrews } from '../../features/crews/hooks';
import { GROUP_TZ, PLAN_DAYS, useTrips } from '../../features/trips/hooks';
import { useAction } from '../../shared/lib/useAction';
import { BottomNav, Button, Dialog, List, ListItem, Sheet, type BottomNavItem } from '../../shared/ui';
import { useGroup } from '../providers/group';

type TabKey = 'home' | 'crews' | 'events' | 'members' | 'more';

function activeTab(rest: string): TabKey {
  if (rest === '' || rest === '/') return 'home';
  if (rest.startsWith('/crews')) return 'crews';
  if (rest.startsWith('/events')) return 'events';
  if (rest.startsWith('/members')) return 'members';
  return 'more';
}

interface MoreRow {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: typeof UserRound;
  readonly testId: string;
}

/** Counts the open "needs driver" trips of one crew in the plan window and reports them upward; renders nothing. */
function NeedsDriverSource({ gid, cid, onCount }: { readonly gid: string; readonly cid: string; readonly onCount: (cid: string, count: number) => void }) {
  const from = today(GROUP_TZ);
  const range = useMemo(() => ({ from, to: addDays(from, PLAN_DAYS - 1) }), [from]);
  const trips = useTrips(gid, cid, range);
  useEffect(() => {
    if (trips.status === 'ready') onCount(cid, trips.data.filter((trip) => trip.status === 'needs_driver' && !trip.applied).length);
  }, [trips, cid, onCount]);
  return null;
}

/**
 * Fixed tab bar of the group shell plus the "More" sheet (profile, settings, admin, account, my groups, leave).
 * The Crews tab carries a count: proposals waiting for my answer plus trips of my crews that need a driver.
 */
export function GroupNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { group, me, isAdmin } = useGroup();
  const [more, setMore] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const base = `/g/${group.id}`;
  const active = activeTab(pathname.startsWith(base) ? pathname.slice(base.length) : '');
  const crews = useCrews(group.id);
  const [needsDriver, setNeedsDriver] = useState<Readonly<Record<string, number>>>({});
  const onCount = useCallback((cid: string, count: number) => setNeedsDriver((prev) => (prev[cid] === count ? prev : { ...prev, [cid]: count })), []);
  const mine = useMemo(() => (crews.status === 'ready' ? crews.data.filter((c) => c.memberIds.includes(me.uid)) : []), [crews, me.uid]);
  const activeMine = useMemo(() => mine.filter((c) => c.status === 'active'), [mine]);
  const pendingProposals = mine.filter((c) => c.status === 'proposed' && !c.acceptedIds.includes(me.uid)).length;
  const crewsBadge = pendingProposals + activeMine.reduce((sum, c) => sum + (needsDriver[c.id] ?? 0), 0);

  const leave = useAction(async () => {
    await leaveGroup(group.id, me.uid);
    setLeaving(false);
    setMore(false);
    navigate('/', { replace: true });
  });

  const items: BottomNavItem[] = [
    { key: 'home', label: t('nav.home'), icon: Home, href: base, testId: 'nav-home' },
    { key: 'crews', label: t('nav.crews'), icon: Users, href: `${base}/crews`, badge: crewsBadge, testId: 'nav-crews' },
    { key: 'events', label: t('nav.events'), icon: CalendarDays, href: `${base}/events`, testId: 'nav-events' },
    { key: 'members', label: t('nav.members'), icon: UserRound, href: `${base}/members`, testId: 'nav-members' },
    { key: 'more', label: t('nav.more'), icon: Menu, testId: 'nav-more' },
  ];
  const rows: MoreRow[] = [
    { key: 'profile', href: `${base}/profile`, label: t('nav.profile'), icon: UserRound, testId: 'nav-profile' },
    ...(isAdmin
      ? [
          { key: 'settings', href: `${base}/settings`, label: t('nav.settings'), icon: Settings, testId: 'nav-settings' },
          { key: 'admin', href: `${base}/admin`, label: t('nav.admin'), icon: BarChart3, testId: 'nav-admin' },
        ]
      : []),
    { key: 'me', href: '/me', label: t('nav.me'), icon: CircleUserRound, testId: 'nav-me' },
    { key: 'groups', href: '/', label: t('nav.myGroups'), icon: LayoutGrid, testId: 'nav-my-groups' },
  ];

  const go = (href: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setMore(false);
    navigate(href);
  };

  return (
    <>
      {activeMine.map((crew) => (
        <NeedsDriverSource key={crew.id} gid={group.id} cid={crew.id} onCount={onCount} />
      ))}
      <BottomNav
        items={items}
        activeKey={active}
        label={t('nav.mainMenu')}
        className="lg:border-x lg:border-line"
        onSelect={(item, event) => {
          if (item.href) {
            event.preventDefault();
            navigate(item.href);
          } else {
            setMore(true);
          }
        }}
      />
      <Sheet open={more} onClose={() => setMore(false)} title={t('nav.more')} closeLabel={t('common.close')}>
        <List inset={false} className="-mx-4">
          {rows.map((row) => (
            <ListItem
              key={row.key}
              leading={<row.icon aria-hidden="true" className="size-5" />}
              title={row.label}
              href={row.href}
              onClick={go(row.href)}
              current={pathname === row.href ? 'page' : undefined}
              selected={pathname === row.href}
              data-testid={row.testId}
            />
          ))}
          {me.role !== 'owner' && (
            <ListItem
              leading={<LogOut aria-hidden="true" className="size-5 text-danger-ink" />}
              title={<span className="text-danger-ink">{t('nav.leaveGroup')}</span>}
              onClick={() => setLeaving(true)}
              data-testid="nav-leave-group"
            />
          )}
        </List>
      </Sheet>
      <Dialog
        open={leaving}
        onClose={() => setLeaving(false)}
        role="alertdialog"
        title={t('nav.leaveGroupConfirmTitle')}
        description={t('nav.leaveGroupConfirmBody', { name: group.name })}
        actions={
          <>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={leave.busy} onClick={() => leave.run()}>
              {t('nav.leaveGroupAction')}
            </Button>
          </>
        }
      />
    </>
  );
}
