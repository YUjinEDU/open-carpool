import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { showToast } from '../../components/Toast';
import { createCrew } from '../../data/crews';
import type { Member, Weekday } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { weekdayName, WEEKDAYS } from '../profile/schedule';
import { emptyCrewDraft, parseCrewDraft, type CrewDraft, type CrewFormError } from './crewDraft';

export interface CrewFormProps {
  readonly members: readonly Member[];
  /** Members pre-selected besides me (e.g. from a suggestion). */
  readonly initialMemberIds?: readonly string[];
  readonly onDone: () => void;
}

/** New crew: 2-6 members including me, at least one driver; created as 'proposed'. */
export function CrewForm({ members, initialMemberIds = [], onDone }: CrewFormProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const [draft, setDraft] = useState<CrewDraft>(() => emptyCrewDraft(me.uid, initialMemberIds));
  const [errors, setErrors] = useState<readonly CrewFormError[]>([]);
  const set = (patch: Partial<CrewDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleMember = (uid: string, on: boolean) =>
    set({ memberIds: on ? [...draft.memberIds, uid] : draft.memberIds.filter((id) => id !== uid) });
  const toggleDay = (d: Weekday, on: boolean) => set({ days: on ? [...draft.days, d] : draft.days.filter((x) => x !== d) });

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
    <form onSubmit={onSubmit} data-testid="crew-form">
      <label htmlFor="crew-name">{t('crewForm.name')}</label>
      <input id="crew-name" maxLength={40} value={draft.name} onChange={(e) => set({ name: e.target.value })} data-testid="crew-name" />
      <fieldset>
        <legend>{t('crewForm.members')}</legend>
        {members.map((m) => (
          <div key={m.uid}>
            <input
              id={`crew-member-${m.uid}`}
              type="checkbox"
              checked={draft.memberIds.includes(m.uid)}
              disabled={m.uid === me.uid}
              onChange={(e) => toggleMember(m.uid, e.target.checked)}
              data-testid={`crew-member-${m.uid}`}
            />
            <label htmlFor={`crew-member-${m.uid}`}>
              {m.displayName}
              {m.canDrive && ` · ${t('crewForm.driver')}`}
            </label>
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('crewForm.days')}</legend>
        {WEEKDAYS.map((d) => (
          <span key={d}>
            <input
              id={`crew-day-${d}`}
              type="checkbox"
              checked={draft.days.includes(d)}
              onChange={(e) => toggleDay(d, e.target.checked)}
              data-testid={`crew-day-${d}`}
            />
            <label htmlFor={`crew-day-${d}`}>{weekdayName(d, i18n.language)}</label>
          </span>
        ))}
      </fieldset>
      <label htmlFor="crew-out-time">{t('crewForm.outTime')}</label>
      <input id="crew-out-time" type="time" value={draft.outTime} onChange={(e) => set({ outTime: e.target.value })} data-testid="crew-out-time" />
      <label htmlFor="crew-back-time">{t('crewForm.backTime')}</label>
      <input id="crew-back-time" type="time" value={draft.backTime} onChange={(e) => set({ backTime: e.target.value })} data-testid="crew-back-time" />
      <label htmlFor="crew-pickup-note">{t('crewForm.pickupNote')}</label>
      <input id="crew-pickup-note" maxLength={200} value={draft.pickupNote} onChange={(e) => set({ pickupNote: e.target.value })} data-testid="crew-pickup-note" />
      <label htmlFor="crew-wait-limit">{t('crewForm.waitLimit')}</label>
      <input
        id="crew-wait-limit"
        type="number"
        min={0}
        max={60}
        value={draft.waitLimitMin}
        onChange={(e) => set({ waitLimitMin: Number(e.target.value) })}
        data-testid="crew-wait-limit"
      />
      {errors.length > 0 && (
        <ul role="alert" data-testid="crew-form-errors">
          {errors.map((err) => (
            <li key={err}>{t(`crewForm.error.${err}`)}</li>
          ))}
        </ul>
      )}
      <button type="submit" disabled={create.busy} data-testid="crew-create-submit">
        {t('crewForm.submit')}
      </button>
      <button type="button" onClick={onDone}>
        {t('crewForm.cancel')}
      </button>
    </form>
  );
}
