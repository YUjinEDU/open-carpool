import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Crew } from '../../domain/types';
import { Banner, Button, Dialog } from '../../shared/ui';
import { useProposalActions } from './useProposalActions';

export interface ProposalBannerProps {
  readonly crew: Crew;
  /** Where the crew's name should lead (crew detail). */
  readonly onOpen?: () => void;
}

/** "You were invited to crew X": accept (primary) or decline (ghost, confirmed) right where it is seen. */
export function ProposalBanner({ crew, onOpen }: ProposalBannerProps) {
  const { t } = useTranslation();
  const { canRespond, accept, decline } = useProposalActions(crew);
  const [declining, setDeclining] = useState(false);
  if (!canRespond) return null;
  const close = () => {
    setDeclining(false);
    decline.clearError();
  };
  return (
    <>
      <Banner
        variant="info"
        title={t('groupHome.proposalTitle', { crew: crew.name })}
        data-testid={`proposal-banner-${crew.id}`}
        action={
          <span className="flex flex-wrap gap-2">
            <Button loading={accept.busy} loadingLabel={t('crews.accepting')} onClick={() => accept.run()} data-testid="crew-accept">
              {t('crews.accept')}
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(true)} data-testid="crew-decline">
              {t('crews.decline')}
            </Button>
            {onOpen && (
              <Button variant="ghost" onClick={onOpen}>
                {t('groupHome.openCrew')}
              </Button>
            )}
          </span>
        }
      >
        {t('groupHome.proposalBody')}
      </Banner>
      <Dialog
        open={declining}
        onClose={close}
        role="alertdialog"
        title={t('crews.declineTitle')}
        description={t('crews.declineBody')}
        actions={
          <>
            <Button variant="secondary" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={decline.busy} loadingLabel={t('crews.declining')} onClick={() => decline.run(close)} data-testid="crew-decline-confirm">
              {t('crews.declineAction')}
            </Button>
          </>
        }
      >
        {decline.error && <Banner variant="danger">{decline.error}</Banner>}
      </Dialog>
    </>
  );
}
