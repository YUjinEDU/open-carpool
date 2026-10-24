import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSession } from '../../app/providers/session';
import { createGroup } from '../../data/groups';
import { defaultPolicyFor, legalNoticeKey } from '../../domain/policies';
import { currentLocale } from '../../shared/i18n';
import { useAction } from '../../shared/lib/useAction';
import type { Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { GroupBasicsFields, type GroupBasics } from './GroupBasicsFields';

export function CreateGroupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const [basics, setBasics] = useState<GroupBasics>(() => ({
    name: '',
    type: 'company',
    country: currentLocale() === 'ko' ? 'KR' : 'US',
  }));
  const [destination, setDestination] = useState<Place | null>(null);
  const policy = defaultPolicyFor(basics.country);

  const create = useAction(async () => {
    const group = await createGroup(
      {
        name: basics.name.trim(),
        type: basics.type,
        country: basics.country,
        locale: currentLocale(),
        allowedEmailDomains: [],
        destination: destination?.point ? { label: destination.label, ...destination.point } : null,
        policy,
      },
      profile,
    );
    navigate(`/g/${group.id}/settings`);
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.run();
  };

  return (
    <main className="p-4">
      <h1>{t('createGroup.title')}</h1>
      <form onSubmit={onSubmit}>
        <GroupBasicsFields prefix="group" value={basics} onChange={setBasics} />
        <PlaceSearch
          id="group-destination"
          label={t('group.destination')}
          country={basics.country}
          value={destination}
          onChange={setDestination}
        />
        <p data-testid="group-legal-notice">{t(legalNoticeKey({ country: basics.country, policy }))}</p>
        <button type="submit" disabled={create.busy} data-testid="group-create-submit">
          {t('createGroup.submit')}
        </button>
      </form>
    </main>
  );
}
