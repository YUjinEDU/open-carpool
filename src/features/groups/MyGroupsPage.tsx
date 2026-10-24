import { useState, type FormEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CircleUserRound, KeyRound, Plus, Users } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useSession } from '../../app/providers/session';
import { PageBody } from '../../app/shell/PageBody';
import { normalizeInviteCode } from '../../data/groups';
import { Avatar, Button, Card, CardHeader, EmptyState, IconButton, Input, List, ListItem, Skeleton, TopBar } from '../../shared/ui';
import { useMyGroups } from './hooks';
import { countryName } from './options';

const groupInitials = (name: string): string => Array.from(name.replace(/\s+/g, '')).slice(0, 2).join('');

export function MyGroupsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [groups, reload] = useMyGroups(user.uid);
  const [code, setCode] = useState('');

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/join/${encodeURIComponent(normalizeInviteCode(code))}`);
  };
  const go = (href: string) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(href);
  };

  return (
    <>
      <TopBar
        title={t('myGroups.title')}
        trailing={<IconButton label={t('myGroups.account')} icon={<CircleUserRound />} onClick={() => navigate('/me')} data-testid="nav-me" />}
      />
      <PageBody>
        {groups.status === 'loading' && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
        {groups.status === 'error' && <ErrorBanner error={groups.error} onRetry={reload} />}
        {groups.status === 'ready' &&
          (groups.data.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={<Users />}
                title={t('myGroups.empty')}
                description={t('myGroups.emptyHint')}
                data-testid="my-groups-empty"
                action={
                  <Button leadingIcon={<Plus />} onClick={() => navigate('/groups/new')} data-testid="create-group-link">
                    {t('myGroups.create')}
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <List data-testid="my-groups">
                {groups.data.map((g) => (
                  <ListItem
                    key={g.id}
                    leading={<Avatar name={g.name} initials={groupInitials(g.name)} size="md" />}
                    title={g.name}
                    description={`${t(`groupType.${g.type}`)} · ${countryName(g.country, i18n.language)}`}
                    href={`/g/${g.id}`}
                    onClick={go(`/g/${g.id}`)}
                    data-testid="group-link"
                  />
                ))}
              </List>
              <Button variant="secondary" leadingIcon={<Plus />} onClick={() => navigate('/groups/new')} data-testid="create-group-link">
                {t('myGroups.create')}
              </Button>
            </>
          ))}

        <Card as="section">
          <CardHeader title={t('myGroups.joinTitle')} description={t('myGroups.joinHint')} />
          <form onSubmit={onJoin} className="mt-4 flex flex-col gap-3">
            <Input
              id="join-code"
              label={t('myGroups.joinCode')}
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              leading={<KeyRound />}
              className="font-mono uppercase tracking-[0.15em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-testid="join-code"
            />
            <Button type="submit" variant="secondary" data-testid="join-code-submit">
              {t('myGroups.join')}
            </Button>
          </form>
        </Card>
      </PageBody>
    </>
  );
}
