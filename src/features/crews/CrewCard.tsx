import { type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Check, ChevronRight } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { acceptCrew } from '../../data/crews';
import type { Crew } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { AvatarStack, Badge, Button, Card, showToast } from '../../shared/ui';
import { weekdayRange } from '../profile/schedule';

export interface CrewCardProps {
  readonly crew: Crew;
  readonly names: ReadonlyMap<string, string>;
}

/** One crew in the crews list: who, when, status, and Accept for proposals I have not answered. */
export function CrewCard({ crew, names }: CrewCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group, me } = useGroup();
  const href = `/g/${group.id}/crews/${crew.id}`;
  const name = (uid: string) => names.get(uid) ?? uid;
  const pending = crew.memberIds.filter((uid) => !crew.acceptedIds.includes(uid));
  const canAccept = crew.status === 'proposed' && crew.memberIds.includes(me.uid) && !crew.acceptedIds.includes(me.uid);
  const accept = useAction(async () => {
    const updated = await acceptCrew(group.id, crew.id, me.uid);
    showToast(t(updated.status === 'active' ? 'crews.activeToast' : 'crews.acceptedToast'), 'success');
  });
  const open = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(href);
  };
  const status =
    crew.status === 'active' ? (
      <Badge variant="success" icon={<Check />} data-testid="crew-card-status">{t('crews.status.active')}</Badge>
    ) : crew.status === 'proposed' ? (
      <Badge variant="info" data-testid="crew-card-status">{t('crews.status.proposed')}</Badge>
    ) : (
      <Badge data-testid="crew-card-status">{t('crews.status.paused')}</Badge>
    );
  const times = [crew.outTime && `${t('trip.leg.out')} ${crew.outTime}`, crew.backTime && `${t('trip.leg.back')} ${crew.backTime}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card as="li" padding="none" data-testid={`crew-card-${crew.id}`}>
      <a href={href} onClick={open} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 active:bg-surface-3" data-testid="crew-card-link">
        <AvatarStack people={crew.memberIds.map((uid) => ({ name: name(uid) }))} size="sm" max={3} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-ink">{crew.name}</span>
          <span className="mt-0.5 block truncate text-sub text-ink-2">{weekdayRange(crew.days, i18n.language)}</span>
          {times && <span className="block text-sub tabular-nums text-ink-2">{times}</span>}
        </span>
        {status}
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
      </a>
      <div className="flex flex-col gap-3 px-4 pb-3">
        <p className="text-caption text-ink-3">
          {crew.memberIds.map((uid) => name(uid)).join(', ')}
          {crew.status === 'proposed' && pending.length > 0 && ` · ${t('crews.waiting', { count: pending.length })}`}
        </p>
        {canAccept && (
          <Button size="sm" loading={accept.busy} loadingLabel={t('crews.accepting')} onClick={() => accept.run()} className="self-start" data-testid="crew-accept">
            {t('crews.accept')}
          </Button>
        )}
      </div>
    </Card>
  );
}
