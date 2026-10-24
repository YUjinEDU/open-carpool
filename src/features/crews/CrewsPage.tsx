import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { suggestCrews } from '../../domain/suggest';
import type { Member } from '../../domain/types';
import { useMembers } from '../members/hooks';
import { CrewCard } from './CrewCard';
import { CrewForm } from './CrewForm';
import { useCrews } from './hooks';

/** Form state: closed, or open with members pre-selected besides me. */
type FormState = { readonly open: false } | { readonly open: true; readonly memberIds: readonly string[] };

/** `/g/:gid/crews`: my crews, other crews, suggestions and the new-crew form. */
export function CrewsPage() {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const crews = useCrews(group.id);
  const [members] = useMembers(group.id);
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

  if (crews.status === 'error') return <p role="alert">{t('common.errorWith', { message: crews.error.message })}</p>;
  if (members.status === 'error') return <p role="alert">{t('common.errorWith', { message: members.error.message })}</p>;
  if (crews.status === 'loading' || members.status === 'loading') return <LoadingState />;
  const mine = crews.data.filter((c) => c.memberIds.includes(me.uid));
  const others = crews.data.filter((c) => !c.memberIds.includes(me.uid));

  return (
    <main className="p-4">
      <h1>{t('crews.title')}</h1>
      <button type="button" onClick={() => setForm({ open: true, memberIds: [] })} data-testid="crew-new">
        {t('crews.new')}
      </button>
      {form.open && (
        <Fragment key={form.memberIds.join(',')}>
          <CrewForm members={active} initialMemberIds={form.memberIds} onDone={() => setForm({ open: false })} />
        </Fragment>
      )}
      <section aria-labelledby="my-crews-heading">
        <h2 id="my-crews-heading">{t('crews.mine')}</h2>
        {mine.length === 0 && <p data-testid="crews-mine-empty">{t('crews.mineEmpty')}</p>}
        <ul>
          {mine.map((crew) => (
            <Fragment key={crew.id}>
              <CrewCard crew={crew} names={names} />
            </Fragment>
          ))}
        </ul>
      </section>
      {others.length > 0 && (
        <section aria-labelledby="other-crews-heading">
          <h2 id="other-crews-heading">{t('crews.others')}</h2>
          <ul>
            {others.map((crew) => (
              <Fragment key={crew.id}>
              <CrewCard crew={crew} names={names} />
            </Fragment>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="suggested-crews-heading">
        <h2 id="suggested-crews-heading">{t('crews.suggested')}</h2>
        {!hasProfile && <p>{t('crews.suggestNeedsProfile')}</p>}
        {hasProfile && suggestions.length === 0 && <p>{t('crews.suggestEmpty')}</p>}
        <ul>
          {suggestions.map((s) => (
            <li key={s.memberIds.join(',')} data-testid="crew-suggestion">
              <p>{s.memberIds.map((uid) => names.get(uid) ?? uid).join(', ')}</p>
              <p>{s.reasons.map((r) => t(r.key, r.params)).join(' · ')}</p>
              <button type="button" onClick={() => setForm({ open: true, memberIds: s.memberIds })}>
                {t('crews.suggestUse')}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
