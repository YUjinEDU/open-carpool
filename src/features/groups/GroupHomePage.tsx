import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LoadingState } from '../../app/fallbacks';
import { useGroup } from '../../app/providers/group';
import { useCrews } from '../crews/hooks';
import { NavLinks } from '../map/NavLinks';

/** Group home: my crews (U4 adds today / this week cards). */
export function GroupHomePage() {
  const { t } = useTranslation();
  const { group, me } = useGroup();
  const crews = useCrews(group.id);
  const mine = crews.status === 'ready' ? crews.data.filter((c) => c.memberIds.includes(me.uid)) : [];

  return (
    <main className="p-4">
      <h1 data-testid="group-home-title">{group.name}</h1>
      {group.destination && (
        <section aria-labelledby="destination-heading">
          <h2 id="destination-heading">{t('group.destination')}</h2>
          <p>{group.destination.label}</p>
          <NavLinks group={group} />
        </section>
      )}
      <section aria-labelledby="my-crews-heading">
        <h2 id="my-crews-heading">{t('groupHome.myCrews')}</h2>
        {crews.status === 'loading' && <LoadingState />}
        {crews.status === 'error' && <p role="alert">{t('common.errorWith', { message: crews.error.message })}</p>}
        {crews.status === 'ready' && mine.length === 0 && <p data-testid="my-crews-empty">{t('groupHome.noCrews')}</p>}
        <ul>
          {mine.map((crew) => (
            <li key={crew.id}>
              <Link to={`crews/${crew.id}`} data-testid="crew-link">
                {crew.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="crews" data-testid="group-home-crews">
          {t('groupHome.allCrews')}
        </Link>
      </section>
    </main>
  );
}
