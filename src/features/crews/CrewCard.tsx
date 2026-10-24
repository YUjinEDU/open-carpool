import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Check, ChevronRight } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import type { Crew } from '../../domain/types';
import { AvatarStack, Badge, Banner, Button, Card, Dialog } from '../../shared/ui';
import { weekdayRange } from '../profile/schedule';
import { useProposalActions } from './useProposalActions';

export interface CrewCardProps {
  readonly crew: Crew;
  readonly names: ReadonlyMap<string, string>;
}

/** One crew in the crews list: who, when, status, and Accept / Decline for proposals I have not answered. */
export function CrewCard({ crew, names }: CrewCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { group } = useGroup();
  const href = `/g/${group.id}/crews/${crew.id}`;
  const name = (uid: string) => names.get(uid) ?? uid;
  const pending = crew.memberIds.filter((uid) => !crew.acceptedIds.includes(uid));
  const { canRespond, accept, decline } = useProposalActions(crew);
  const [declining, setDeclining] = useState(false);
  const closeDecline = () => {
    setDeclining(false);
    decline.clearError();
  };
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
  // One time per line: "출발 07:40 · 귀가 18:30" wrapped mid-pair at phone widths.
  const times = [crew.outTime && `${t('trip.leg.out')} ${crew.outTime}`, crew.backTime && `${t('trip.leg.back')} ${crew.backTime}`].filter(Boolean);

  return (
    <Card as="li" padding="none" data-testid={`crew-card-${crew.id}`}>
      <a href={href} onClick={open} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 active:bg-surface-3" data-testid="crew-card-link">
        <AvatarStack people={crew.memberIds.map((uid) => ({ name: name(uid) }))} size="sm" max={3} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-ink">{crew.name}</span>
          <span className="mt-0.5 block truncate text-sub text-ink-2">{weekdayRange(crew.days, i18n.language)}</span>
          {times.length > 0 && (
            <span className="flex flex-wrap gap-x-3 text-sub tabular-nums text-ink-2">
              {times.map((time) => (
                <span key={time} className="whitespace-nowrap">{time}</span>
              ))}
            </span>
          )}
        </span>
        {status}
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
      </a>
      <div className="flex flex-col gap-3 px-4 pb-3">
        <p className="text-caption text-ink-3">
          {crew.memberIds.map((uid) => name(uid)).join(', ')}
          {crew.status === 'proposed' && pending.length > 0 && ` · ${t('crews.waiting', { count: pending.length })}`}
        </p>
        {canRespond && (
          <div className="flex flex-wrap gap-2">
            <Button loading={accept.busy} loadingLabel={t('crews.accepting')} onClick={() => accept.run()} data-testid="crew-accept">
              {t('crews.accept')}
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(true)} data-testid="crew-decline">
              {t('crews.decline')}
            </Button>
          </div>
        )}
      </div>
      <Dialog
        open={declining}
        onClose={closeDecline}
        role="alertdialog"
        title={t('crews.declineTitle')}
        description={t('crews.declineBody')}
        actions={
          <>
            <Button variant="secondary" onClick={closeDecline}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={decline.busy} loadingLabel={t('crews.declining')} onClick={() => decline.run(closeDecline)} data-testid="crew-decline-confirm">
              {t('crews.declineAction')}
            </Button>
          </>
        }
      >
        {decline.error && <Banner variant="danger">{decline.error}</Banner>}
      </Dialog>
    </Card>
  );
}
