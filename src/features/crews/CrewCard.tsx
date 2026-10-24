import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGroup } from '../../app/providers/group';
import { showToast } from '../../components/Toast';
import { acceptCrew } from '../../data/crews';
import type { Crew } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { weekdayName } from '../profile/schedule';

export interface CrewCardProps {
  readonly crew: Crew;
  readonly names: ReadonlyMap<string, string>;
}

export function CrewCard({ crew, names }: CrewCardProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const canAccept = crew.status === 'proposed' && crew.memberIds.includes(me.uid) && !crew.acceptedIds.includes(me.uid);
  const accept = useAction(async () => {
    const updated = await acceptCrew(group.id, crew.id, me.uid);
    showToast(t(updated.status === 'active' ? 'crews.activeToast' : 'crews.acceptedToast'), 'success');
  });

  return (
    <li data-testid={`crew-card-${crew.id}`} className="p-4">
      <Link to={crew.id} data-testid="crew-card-link">
        {crew.name}
      </Link>{' '}
      <span data-testid="crew-card-status">{t(`crews.status.${crew.status}`)}</span>
      <p>{crew.memberIds.map((uid) => `${names.get(uid) ?? uid}${crew.acceptedIds.includes(uid) ? '' : ` (${t('crews.pending')})`}`).join(', ')}</p>
      <p>
        {crew.days.map((d) => weekdayName(d, i18n.language)).join(' ')}
        {crew.outTime && ` · ${t('trip.leg.out')} ${crew.outTime}`}
        {crew.backTime && ` · ${t('trip.leg.back')} ${crew.backTime}`}
      </p>
      {canAccept && (
        <button type="button" disabled={accept.busy} onClick={() => accept.run()} data-testid="crew-accept">
          {t('crews.accept')}
        </button>
      )}
    </li>
  );
}
