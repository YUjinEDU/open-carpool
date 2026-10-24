import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSession } from '../../app/providers/session';
import { PageBody } from '../../app/shell/PageBody';
import { createGroup } from '../../data/groups';
import { defaultPolicyFor } from '../../domain/policies';
import { currentLocale } from '../../shared/i18n';
import { useAction } from '../../shared/lib/useAction';
import { Button, Card, List, ListItem, TopBar } from '../../shared/ui';
import type { Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { GroupBasicsFields, type GroupBasics } from './GroupBasicsFields';
import { LegalNotice } from './LegalNotice';

type Step = 1 | 2 | 3;

/** Three short steps: basics, optional destination, policy summary. Defaults do the policy work. */
export function CreateGroupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const [step, setStep] = useState<Step>(1);
  const [basics, setBasics] = useState<GroupBasics>(() => ({
    name: '',
    type: 'company',
    country: currentLocale() === 'ko' ? 'KR' : 'US',
  }));
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState<Place | null>(null);
  const policy = defaultPolicyFor(basics.country);
  const stepNames = { 1: t('createGroup.step1'), 2: t('createGroup.step2'), 3: t('createGroup.step3') } as const;

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
    // replace: the back arrow must not return to an empty wizard that looks like "not created".
    navigate(`/g/${group.id}`, { replace: true, state: { created: true } });
  });

  const next = () => {
    if (step === 1 && basics.name.trim() === '') {
      setNameError(t('createGroup.nameError'));
      return;
    }
    setNameError(undefined);
    setStep(step === 1 ? 2 : 3);
  };
  const back = () => (step === 1 ? navigate('/') : setStep(step === 3 ? 2 : 1));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < 3) next();
    else create.run();
  };

  return (
    <>
      <TopBar title={t('createGroup.title')} onBack={back} backLabel={t('nav.back')} />
      <PageBody>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-caption font-medium text-ink-3" aria-live="polite">
            {t('createGroup.step', { step, name: stepNames[step] })}
          </p>

          {step === 1 && (
            <Card className="flex flex-col gap-4">
              <GroupBasicsFields prefix="group" value={basics} onChange={setBasics} nameError={nameError} />
            </Card>
          )}

          {step === 2 && (
            <Card className="flex flex-col gap-4">
              <PlaceSearch
                id="group-destination"
                label={t('group.destination')}
                hint={t('createGroup.destinationHint')}
                country={basics.country}
                value={destination}
                onChange={setDestination}
              />
            </Card>
          )}

          {step === 3 && (
            <>
              <Card padding="none">
                <List inset={false}>
                  <ListItem title={t('createGroup.summaryCost')} trailing={<span className="text-body text-ink">{t(`costMode.${policy.costMode}`)}</span>} />
                  <ListItem title={t('createGroup.summaryCutoff')} trailing={<span className="text-body text-ink">{t('createGroup.cutoffValue', { hour: policy.absenceCutoffHour })}</span>} />
                  <ListItem title={t('createGroup.summaryPlate')} trailing={<span className="text-body text-ink">{t(`plateRotation.${policy.plateRotation}`)}</span>} />
                </List>
              </Card>
              <LegalNotice group={{ country: basics.country, policy }} data-testid="group-legal-notice" />
              <p className="text-caption text-ink-3">{t('createGroup.summaryHint')}</p>
            </>
          )}

          <div className={step === 1 ? 'mt-2 grid gap-2' : 'mt-2 grid grid-cols-2 gap-2'}>
            {step > 1 && (
              <Button type="button" variant="secondary" size="lg" onClick={back} data-testid="group-back">
                {t('common.previous')}
              </Button>
            )}
            {step < 3 ? (
              <Button type="submit" size="lg" variant={step === 2 && !destination ? 'secondary' : 'primary'} data-testid="group-next">
                {step === 2 && !destination ? t('createGroup.later') : t('common.next')}
              </Button>
            ) : (
              <Button type="submit" size="lg" loading={create.busy} loadingLabel={t('createGroup.creating')} data-testid="group-create-submit">
                {t('createGroup.submit')}
              </Button>
            )}
          </div>
        </form>
      </PageBody>
    </>
  );
}
