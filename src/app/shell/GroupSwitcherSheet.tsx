import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Check, KeyRound, Plus } from 'lucide-react';
import { listMyGroups } from '../../data/groups';
import type { Group } from '../../domain/types';
import { useLoad } from '../../shared/lib/loadable';
import { Avatar, List, ListItem, Sheet, Skeleton } from '../../shared/ui';
import { ErrorBanner } from '../fallbacks';
import { useSession } from '../providers/session';

export interface GroupSwitcherSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly current: Group;
}

const groupInitials = (name: string): string => Array.from(name.replace(/\s+/g, '')).slice(0, 2).join('');

/** Opened from the Home TopBar title: my groups, plus "create" and "join with a code". */
export function GroupSwitcherSheet({ open, onClose, current }: GroupSwitcherSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [groups, reload] = useLoad(() => (open ? listMyGroups(user.uid) : Promise.resolve(null)), [open, user.uid]);
  const go = (href: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onClose();
    navigate(href);
  };
  const shown = groups.status === 'ready' && groups.data ? groups.data : [];
  const list = shown.some((g) => g.id === current.id) ? shown : [current, ...shown];

  return (
    <Sheet open={open} onClose={onClose} title={t('nav.myGroups')} closeLabel={t('common.close')}>
      <div className="-mx-4">
        {groups.status === 'loading' && (
          <div className="flex flex-col gap-3 px-4 py-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {groups.status === 'error' && <ErrorBanner error={groups.error} onRetry={reload} className="mx-4" />}
        <List inset={false}>
          {list.map((g) => {
            const selected = g.id === current.id;
            return (
              <ListItem
                key={g.id}
                leading={<Avatar name={g.name} initials={groupInitials(g.name)} size="md" />}
                title={g.name}
                description={t(`groupType.${g.type}`)}
                trailing={selected ? <Check aria-hidden="true" className="size-5 text-accent-ink" /> : undefined}
                selected={selected}
                current={selected ? 'page' : undefined}
                href={`/g/${g.id}`}
                onClick={go(`/g/${g.id}`)}
                data-testid="switcher-group"
              />
            );
          })}
          <ListItem
            leading={<Plus aria-hidden="true" className="size-5 text-accent-ink" />}
            title={t('myGroups.create')}
            href="/groups/new"
            onClick={go('/groups/new')}
          />
          <ListItem
            leading={<KeyRound aria-hidden="true" className="size-5 text-accent-ink" />}
            title={t('myGroups.joinTitle')}
            href="/"
            onClick={go('/')}
          />
        </List>
      </div>
    </Sheet>
  );
}
