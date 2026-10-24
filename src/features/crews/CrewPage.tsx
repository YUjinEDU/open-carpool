import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { LoadingState } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { legalNoticeKey } from '../../domain/policies';
import type { Crew, Member } from '../../domain/types';
import { useMembers } from '../members/hooks';
import { useCrewPlan } from '../trips/hooks';
import { compareTrips } from '../trips/nextTrip';
import { TripCard } from '../trips/TripCard';
import { useCrews } from './hooks';
import { ledgerRows } from './ledger';

/** `/g/:gid/crews/:cid`: members, ledger and this week's plan. */
export function CrewPage() {
  const { t } = useTranslation();
  const { cid = '' } = useParams();
  const { group } = useGroup();
  const crews = useCrews(group.id);
  const [members] = useMembers(group.id);

  if (crews.status === 'error') return <p role="alert">{t('common.errorWith', { message: crews.error.message })}</p>;
  if (members.status === 'error') return <p role="alert">{t('common.errorWith', { message: members.error.message })}</p>;
  if (crews.status === 'loading' || members.status === 'loading') return <LoadingState />;
  const crew = crews.data.find((c) => c.id === cid);
  if (!crew) {
    return (
      <main className="p-4">
        <p role="alert">{t('crew.notFound')}</p>
      </main>
    );
  }
  return <CrewDetail crew={crew} members={members.data} />;
}

function CrewDetail({ crew, members }: { readonly crew: Crew; readonly members: readonly Member[] }) {
  const { t } = useTranslation();
  const { group } = useGroup();
  const trips = useCrewPlan(crew, members);
  const names = useMemo(() => new Map(members.map((m) => [m.uid, m.displayName])), [members]);

  return (
    <main className="p-4">
      <h1 data-testid="crew-title">{crew.name}</h1>
      <p data-testid="crew-status">{t(`crews.status.${crew.status}`)}</p>
      {crew.pickupNote && <p>{t('crew.pickup', { note: crew.pickupNote })}</p>}
      <p>{t('crew.waitLimit', { min: crew.waitLimitMin })}</p>
      <section aria-labelledby="crew-ledger-heading">
        <h2 id="crew-ledger-heading">{t('crew.ledger')}</h2>
        <p>{t('crew.ledgerHint')}</p>
        <ul>
          {ledgerRows(crew, members).map((row) => (
            <li key={row.uid} data-testid={`ledger-row-${row.uid}`}>
              {row.name}
              {row.isCaptain && ` · ${t('crew.captain')}`}
              {row.isBackup && ` · ${t('crew.backup')}`}
              {' · '}
              {t('crew.rides', { rides: row.rides })}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="crew-week-heading">
        <h2 id="crew-week-heading">{t('crew.week')}</h2>
        {crew.status !== 'active' && <p>{t('crew.notActive')}</p>}
        {trips.status === 'loading' && <LoadingState />}
        {trips.status === 'error' && <p role="alert">{t('common.errorWith', { message: trips.error.message })}</p>}
        {trips.status === 'ready' && crew.status === 'active' && trips.data.length === 0 && <p>{t('crew.noTrips')}</p>}
        {trips.status === 'ready' && (
          <ul>
            {[...trips.data].sort(compareTrips).map((trip) => (
              <Fragment key={trip.id}>
                <TripCard crew={crew} trip={trip} names={names} />
              </Fragment>
            ))}
          </ul>
        )}
      </section>
      <footer>
        <p data-testid="crew-legal-notice">{t(legalNoticeKey(group))}</p>
      </footer>
    </main>
  );
}
