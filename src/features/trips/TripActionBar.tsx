import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { addDays, today } from '../../domain/dates';
import type { Crew, Trip } from '../../domain/types';
import { formatDate } from '../../shared/lib/format';
import { useNow } from '../../shared/lib/useNow';
import { Banner, Button, Dialog, copyText, showToast } from '../../shared/ui';
import { CompleteSheet } from './CompleteSheet';
import { GROUP_TZ } from './hooks';
import { legTime } from './nextTrip';
import { tripActions } from './tripActions';
import { useTripMutations } from './useTripMutations';

type Confirm = 'absent' | 'cant-drive' | 'volunteer';
/** A write that changed the plan for others: the crew is told the next time they open the app, and the member can also share it. */
type Outcome = 'absent' | 'gave-up' | 'volunteered';

export interface TripActionBarProps {
  readonly crew: Crew;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
  /** card = verbs in a plan row; hero = the evening card's two-column row (secondary verb left, primary right). */
  readonly variant?: 'card' | 'hero';
  /** Extra control rendered after the verbs (the hero's "View crew"). */
  readonly children?: ReactNode;
}

/**
 * The verbs a member has on a trip. Absence, hand-over and volunteering confirm in a Dialog that stays
 * open until the write succeeds (a failure shows inside it); completion opens the roster Sheet and can
 * be undone for ten seconds. After a change that affects others, a banner offers "Tell the crew".
 */
export function TripActionBar({ crew, trip, names, variant = 'card', children }: TripActionBarProps) {
  const { t, i18n } = useTranslation();
  const { group, me } = useGroup();
  const now = useNow();
  const actions = tripActions(trip, { me, crew, now, policy: group.policy, tz: GROUP_TZ });
  const m = useTripMutations(crew, trip);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [completing, setCompleting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const hero = variant === 'hero';
  const date = formatDate(trip.date, i18n.language);
  const todayDate = today(GROUP_TZ, now);
  const absentLabel =
    hero && trip.date === addDays(todayDate, 1) ? t('trip.markAbsentTomorrow') : hero && trip.date === todayDate ? t('trip.markAbsentToday') : t('trip.markAbsent');

  const closeConfirm = () => {
    setConfirm(null);
    m.absence.clearError();
    m.giveUp.clearError();
    m.volunteer.clearError();
  };
  const finish = (result: Outcome) => () => {
    setConfirm(null);
    setOutcome(result);
  };
  const myName = names.get(me.uid) ?? me.displayName;
  const shareText = (result: Outcome): string => {
    const key = result === 'absent' ? 'trip.shareAbsent' : result === 'gave-up' ? 'trip.shareGaveUp' : 'trip.shareVolunteer';
    return t(key, { name: myName, date, time: legTime(crew, trip.leg), crew: crew.name, url: `${window.location.origin}/g/${group.id}/crews/${crew.id}` });
  };
  const notifyCrew = async (result: Outcome) => {
    const text = shareText(result);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* dismissed: fall back to copying */
      }
    }
    if (await copyText(text)) showToast(t('trip.shareCopied'), 'success');
  };
  const outcomeTitle = (result: Outcome): string =>
    result === 'absent' ? t('trip.absentDone', { date }) : result === 'gave-up' ? t('trip.gaveUpDone') : t('trip.volunteeredDone');

  const done = actions.done && (
    <Button key="done" loading={m.complete.busy} loadingLabel={t('trip.recording')} onClick={() => setCompleting(true)} data-testid="trip-done">
      {t('trip.done')}
    </Button>
  );
  const volunteer = actions.volunteer && (
    <Button key="volunteer" onClick={() => setConfirm('volunteer')} data-testid="trip-volunteer">
      {t('trip.volunteer')}
    </Button>
  );
  const cantDrive = actions.cantDrive && (
    <Button key="cant-drive" variant="secondary" onClick={() => setConfirm('cant-drive')} data-testid="trip-cant-drive">
      {t('trip.cantDrive')}
    </Button>
  );
  const absence = actions.absence !== null && (
    <Button
      key="absence"
      variant="secondary"
      loading={confirm === null && m.absence.busy}
      onClick={() => (actions.absence === 'mark-absent' ? setConfirm('absent') : m.absence.run(false))}
      data-testid="trip-absent-toggle"
    >
      {actions.absence === 'mark-absent' ? absentLabel : t('trip.markBack')}
    </Button>
  );
  // Hero: the one secondary verb (hand over / absence) and the one primary verb (done / volunteer) side by side.
  const heroVerbs = [cantDrive || absence, done || volunteer].filter(Boolean);
  const both = heroVerbs.length === 2;
  const cardVerbs = [done, volunteer, cantDrive, absence].filter(Boolean);
  // A failure outside a dialog (the "I'm back" toggle) is shown here, next to the verbs.
  const inlineError = confirm === null ? m.absence.error ?? m.giveUp.error ?? m.volunteer.error : null;

  return (
    <>
      {hero
        ? (heroVerbs.length > 0 || children) && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {heroVerbs}
                {!both && children}
              </div>
              {both && children && <div className="flex justify-center">{children}</div>}
            </div>
          )
        : cardVerbs.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{cardVerbs}</div>}
      {inlineError && (
        <Banner variant="danger" onDismiss={closeConfirm} dismissLabel={t('common.dismiss')}>
          {inlineError}
        </Banner>
      )}
      {outcome && (
        <Banner
          variant="success"
          title={outcomeTitle(outcome)}
          onDismiss={() => setOutcome(null)}
          dismissLabel={t('common.dismiss')}
          data-testid="trip-outcome"
          action={
            <Button variant="secondary" leadingIcon={<Share2 />} onClick={() => void notifyCrew(outcome)} data-testid="trip-notify-crew">
              {t('trip.notifyCrew')}
            </Button>
          }
        >
          {t('trip.notifyHint')}
        </Banner>
      )}
      <Dialog
        open={confirm === 'absent'}
        onClose={closeConfirm}
        role="alertdialog"
        title={t('trip.absentConfirmTitle', { date })}
        description={t('trip.absentConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={closeConfirm}>{t('common.cancel')}</Button>
            <Button loading={m.absence.busy} onClick={() => m.absence.run(true, finish('absent'))} data-testid="trip-absent-confirm">
              {t('trip.absentAction')}
            </Button>
          </>
        }
      >
        {m.absence.error && <Banner variant="danger">{m.absence.error}</Banner>}
      </Dialog>
      <Dialog
        open={confirm === 'cant-drive'}
        onClose={closeConfirm}
        role="alertdialog"
        title={t('trip.cantDriveTitle')}
        description={t('trip.cantDriveBody')}
        actions={
          <>
            <Button variant="secondary" onClick={closeConfirm}>{t('common.cancel')}</Button>
            <Button loading={m.giveUp.busy} onClick={() => m.giveUp.run(finish('gave-up'))} data-testid="trip-cant-drive-confirm">
              {t('trip.cantDriveAction')}
            </Button>
          </>
        }
      >
        {m.giveUp.error && <Banner variant="danger">{m.giveUp.error}</Banner>}
      </Dialog>
      <Dialog
        open={confirm === 'volunteer'}
        onClose={closeConfirm}
        role="alertdialog"
        title={t('trip.volunteerTitle', { date })}
        description={t('trip.volunteerBody')}
        actions={
          <>
            <Button variant="secondary" onClick={closeConfirm}>{t('common.cancel')}</Button>
            <Button loading={m.volunteer.busy} onClick={() => m.volunteer.run(finish('volunteered'))} data-testid="trip-volunteer-confirm">
              {t('trip.volunteerAction')}
            </Button>
          </>
        }
      >
        {m.volunteer.error && <Banner variant="danger">{m.volunteer.error}</Banner>}
      </Dialog>
      {actions.done && (
        <CompleteSheet
          open={completing}
          onClose={() => setCompleting(false)}
          crew={crew}
          trip={trip}
          names={names}
          meUid={me.uid}
          busy={m.complete.busy}
          onConfirm={(riderIds) => m.complete.run(riderIds, () => setCompleting(false))}
        />
      )}
    </>
  );
}
