import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { createCrew } from '../../data/crews';
import type { Member, Weekday } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Banner, Button, Card, CardHeader, Checkbox, ChipGroup, Input, TimeField, showToast } from '../../shared/ui';
import { weekdayName, WEEKDAYS } from '../profile/schedule';
import { emptyCrewDraft, parseCrewDraft, type CrewDraft, type CrewFormError } from './crewDraft';

export interface CrewFormProps {
  readonly members: readonly Member[];
  /** Members pre-selected besides me (e.g. from a suggestion). */
  readonly initialMemberIds?: readonly string[];
  readonly onDone: () => void;
}

type DayKey = `${Weekday}`;

/** New crew: 2-6 members including me, at least one driver; created as 'proposed'. */
export function CrewForm({ members, initialMemberIds = [], onDone }: CrewFormProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const [draft, setDraft] = useState<CrewDraft>(() => emptyCrewDraft(me.uid, initialMemberIds));
  const [errors, setErrors] = useState<readonly CrewFormError[]>([]);
  const set = (patch: Partial<CrewDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleMember = (uid: string, on: boolean) =>
    set({ memberIds: on ? [...draft.memberIds, uid] : draft.memberIds.filter((id) => id !== uid) });
  const dayOptions = WEEKDAYS.map((d) => ({ value: `${d}` as DayKey, label: weekdayName(d, i18n.language), testId: `crew-day-${d}` }));

  const create = useAction(async () => {
    const parsed = parseCrewDraft(draft, members, me.uid);
    if (parsed.kind === 'invalid') {
      setErrors(parsed.errors);
      return;
    }
    await createCrew(group.id, parsed.input, me.uid);
    showToast(t('crews.created'), 'success');
    onDone();
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.run();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="crew-form">
      <Card className="flex flex-col gap-4">
        <Input
          id="crew-name"
          label={t('crewForm.name')}
          maxLength={40}
          required
          error={errors.includes('name') ? t('crewForm.error.name') : undefined}
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          data-testid="crew-name"
        />
      </Card>

      <Card padding="none">
        <CardHeader className="px-4 pt-4" title={t('crewForm.members')} description={t('crewForm.membersHint')} as="h3" />
        <ul role="list" className="mt-1 divide-y divide-line px-4">
          {members.map((m) => (
            <li key={m.uid} className="flex items-center gap-3">
              <Avatar name={m.displayName} size="sm" />
              <Checkbox
                boxPosition="end"
                wrapperClassName="flex-1"
                label={m.uid === me.uid ? `${m.displayName} (${t('common.me')})` : m.displayName}
                description={m.canDrive ? t('crew.driverSeats', { seats: m.seats }) : t('crew.riderOnly')}
                checked={draft.memberIds.includes(m.uid)}
                disabled={m.uid === me.uid}
                onChange={(e) => toggleMember(m.uid, e.target.checked)}
                data-testid={`crew-member-${m.uid}`}
              />
            </li>
          ))}
        </ul>
        {(errors.includes('size') || errors.includes('driver')) && (
          <p role="alert" className="px-4 pb-4 pt-2 text-caption font-medium text-danger-ink">
            {errors.includes('size') ? t('crewForm.error.size') : t('crewForm.error.driver')}
          </p>
        )}
        {!(errors.includes('size') || errors.includes('driver')) && <div className="pb-2" />}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sub font-medium text-ink-2">{t('crewForm.days')}</p>
          <ChipGroup
            label={t('crewForm.days')}
            options={dayOptions}
            value={draft.days.map((d) => `${d}` as DayKey)}
            onChange={(days) => set({ days: days.map((d) => Number(d) as Weekday) })}
            showCheck={false}
          />
          {errors.includes('days') && (
            <p role="alert" className="text-caption font-medium text-danger-ink">
              {t('crewForm.error.days')}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TimeField id="crew-out-time" label={t('crewForm.outTime')} value={draft.outTime} onChange={(e) => set({ outTime: e.target.value })} data-testid="crew-out-time" />
          <TimeField id="crew-back-time" label={t('crewForm.backTime')} value={draft.backTime} onChange={(e) => set({ backTime: e.target.value })} data-testid="crew-back-time" />
        </div>
        {errors.includes('time') && (
          <p role="alert" className="-mt-2 text-caption font-medium text-danger-ink">
            {t('crewForm.error.time')}
          </p>
        )}
        <Input
          id="crew-pickup-note"
          label={t('crewForm.pickupNote')}
          optionalLabel={t('common.optional')}
          maxLength={200}
          value={draft.pickupNote}
          onChange={(e) => set({ pickupNote: e.target.value })}
          data-testid="crew-pickup-note"
        />
        <Input
          id="crew-wait-limit"
          label={t('crewForm.waitLimit')}
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          error={errors.includes('waitLimit') ? t('crewForm.error.waitLimit') : undefined}
          value={draft.waitLimitMin}
          onChange={(e) => set({ waitLimitMin: Number(e.target.value) })}
          className="max-w-32"
          data-testid="crew-wait-limit"
        />
      </Card>

      {errors.length > 0 && (
        <Banner variant="danger" title={t('crewForm.errorTitle')} data-testid="crew-form-errors">
          <ul className="list-disc pl-4">
            {errors.map((err) => (
              <li key={err}>{t(`crewForm.error.${err}`)}</li>
            ))}
          </ul>
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onDone}>
          {t('crewForm.cancel')}
        </Button>
        <Button type="submit" size="lg" loading={create.busy} loadingLabel={t('crewForm.creating')} data-testid="crew-create-submit">
          {t('crewForm.submit')}
        </Button>
      </div>
    </form>
  );
}
