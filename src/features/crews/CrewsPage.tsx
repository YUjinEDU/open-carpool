import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, Users } from 'lucide-react';
import { ErrorBanner } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { PageBody } from '../../app/shell/PageBody';
import { suggestCrews } from '../../domain/suggest';
import type { Member } from '../../domain/types';
import { AvatarStack, Button, Card, EmptyState, IconButton, List, Skeleton, TopBar } from '../../shared/ui';
import { useMembers } from '../members/hooks';
import { CrewCard } from './CrewCard';
import { CrewForm } from './CrewForm';
import { PlatePartners } from './PlatePartners';
import { useCrews } from './hooks';

/** Form state: closed, or open with members pre-selected besides me. */
type FormState = { readonly open: false } | { readonly open: true; readonly memberIds: readonly string[] };

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-title-3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** `/g/:gid/crews`: my crews, other crews, suggestions and the new-crew form. */
export function CrewsPage() {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const crews = useCrews(group.id);
  const [members, reloadMembers] = useMembers(group.id);
  const [form, setForm] = useState<FormState>({ open: false });
  const active = useMemo<readonly Member[]>(
    () => (members.status === 'ready' ? members.data.filter((m) => m.status === 'active') : []),
    [members],
  );
  const names = useMemo(() => new Map(active.map((m) => [m.uid, m.displayName])), [active]);
  const hasProfile = me.area !== null && Object.keys(me.schedule).length > 0;
  const suggestions = useMemo(
    () => (hasProfile ? suggestCrews(active).filter((s) => s.memberIds.includes(me.uid)) : []),
    [active, hasProfile, me.uid],
  );
  const loading = crews.status === 'loading' || members.status === 'loading';

  if (form.open) {
    return (
      <>
        <TopBar title={t('crews.new')} onBack={() => setForm({ open: false })} backLabel={t('nav.back')} />
        <PageBody nav>
          {members.status === 'loading' && <Skeleton className="h-64" />}
          {members.status === 'error' && <ErrorBanner error={members.error} onRetry={reloadMembers} />}
          {members.status === 'ready' && (
            <Fragment key={form.memberIds.join(',')}>
              <CrewForm members={active} initialMemberIds={form.memberIds} onDone={() => setForm({ open: false })} />
            </Fragment>
          )}
        </PageBody>
      </>
    );
  }

  const mine = crews.status === 'ready' ? crews.data.filter((c) => c.memberIds.includes(me.uid)) : [];
  const others = crews.status === 'ready' ? crews.data.filter((c) => !c.memberIds.includes(me.uid)) : [];

  return (
    <>
      <TopBar
        title={t('crews.title')}
        trailing={<IconButton label={t('crews.new')} icon={<Plus />} onClick={() => setForm({ open: true, memberIds: [] })} data-testid="crew-new" />}
      />
      <PageBody nav className="gap-6">
        {crews.status === 'error' && <ErrorBanner error={crews.error} onRetry={() => window.location.reload()} />}
        {members.status === 'error' && <ErrorBanner error={members.error} onRetry={reloadMembers} />}
        {loading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {!loading && (
          <Section title={t('crews.mine')}>
            {mine.length === 0 ? (
              <Card variant="tonal" padding="none">
                <EmptyState
                  icon={<Users />}
                  title={t('crews.mineEmpty')}
                  description={t('crews.mineEmptyHint')}
                  data-testid="crews-mine-empty"
                  action={
                    <Button leadingIcon={<Plus />} onClick={() => setForm({ open: true, memberIds: [] })}>
                      {t('crews.create')}
                    </Button>
                  }
                />
              </Card>
            ) : (
              <ul role="list" className="flex flex-col gap-3">
                {mine.map((crew) => (
                  <CrewCard key={crew.id} crew={crew} names={names} />
                ))}
              </ul>
            )}
          </Section>
        )}

        {!loading && others.length > 0 && (
          <Section title={t('crews.others')}>
            <ul role="list" className="flex flex-col gap-3">
              {others.map((crew) => (
                <CrewCard key={crew.id} crew={crew} names={names} />
              ))}
            </ul>
          </Section>
        )}

        {!loading && (
          <Section title={t('crews.suggested')}>
            {!hasProfile && <EmptyState compact icon={<Sparkles />} title={t('crews.suggestEmpty')} description={t('crews.suggestNeedsProfile')} />}
            {hasProfile && suggestions.length === 0 && <EmptyState compact icon={<Sparkles />} title={t('crews.suggestEmpty')} />}
            {suggestions.length > 0 && (
              <List>
                {suggestions.map((s) => (
                  <li key={s.memberIds.join(',')} className="flex flex-col gap-3 px-4 py-3" data-testid="crew-suggestion">
                    <div className="flex items-center gap-3">
                      <AvatarStack people={s.memberIds.map((uid) => ({ name: names.get(uid) ?? uid }))} size="sm" max={4} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">{s.memberIds.map((uid) => names.get(uid) ?? uid).join(', ')}</p>
                        <p className="text-caption text-ink-3">{s.reasons.map((r) => t(r.key, r.params)).join(' · ')}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" className="self-start" onClick={() => setForm({ open: true, memberIds: s.memberIds })}>
                      {t('crews.suggestUse')}
                    </Button>
                  </li>
                ))}
              </List>
            )}
          </Section>
        )}
              <PlatePartners group={group} members={active} me={me} />
      </PageBody>
    </>
  );
}
