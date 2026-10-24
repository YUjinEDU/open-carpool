import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
import { useAuth } from '../../app/providers/auth';
import { useGroup } from '../../app/providers/group';
import { PageBody } from '../../app/shell/PageBody';
import { useBack } from '../../app/shell/useBack';
import { updateMyMember } from '../../data/members';
import type { Weekday } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Button, Card, CardHeader, ChipGroup, Dialog, Input, Switch, TimeField, TopBar, showToast } from '../../shared/ui';
import { isDefaultDisplayName } from '../auth/authService';
import { roundLatLng, type Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { fromDraft, toDraft, weekdayName, WEEKDAYS, type DayDraft, type ScheduleDraft } from './schedule';

type DayKey = `${Weekday}`;
const WORKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5];

/** My member profile in the current group: name, area, driving, weekly schedule. */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { group, me, refresh } = useGroup();
  const { rename } = useAuth();
  const back = useBack(`/g/${group.id}`);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [canDrive, setCanDrive] = useState(me.canDrive);
  const [seats, setSeats] = useState(me.seats || 3);
  const [plate, setPlate] = useState(me.plateLastDigit === null ? '' : String(me.plateLastDigit));
  const [area, setArea] = useState<Place | null>(me.areaLabel ? { label: me.areaLabel, point: me.area } : null);
  const [schedule, setSchedule] = useState<ScheduleDraft>(() => toDraft(me.schedule));
  const [saved, setSaved] = useState(() => JSON.stringify({ displayName: me.displayName, canDrive: me.canDrive, seats: me.seats || 3, plate: me.plateLastDigit === null ? '' : String(me.plateLastDigit), area: me.areaLabel, schedule: toDraft(me.schedule) }));
  const [daysError, setDaysError] = useState<string | undefined>(undefined);
  const usesPlate = group.policy.plateRotation !== 'none';

  const current = JSON.stringify({ displayName, canDrive, seats, plate, area: area?.label ?? '', schedule });
  const dirty = current !== saved;
  const nameError = isDefaultDisplayName(displayName) ? t('auth.nameDefaultError') : undefined;
  // Unsaved changes block every way out (back arrow, tab bar, browser back) until confirmed.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useAction(async () => {
    const name = displayName.trim();
    await updateMyMember(group.id, me.uid, {
      displayName: name,
      canDrive,
      seats: canDrive ? seats : 0,
      plateLastDigit: usesPlate && plate !== '' ? Number(plate) : me.plateLastDigit,
      areaLabel: area?.label ?? '',
      area: area?.point ? roundLatLng(area.point) : null,
      schedule: fromDraft(schedule),
    });
    // One name everywhere: the account and the other memberships follow the group profile.
    if (name !== me.displayName) await rename(name);
    setSaved(current);
    refresh();
    showToast(t('common.saved'), 'success');
  });

  const setDay = (d: Weekday, patch: Partial<DayDraft>) => setSchedule((s) => ({ ...s, [d]: { ...s[d], ...patch } }));
  const selectedDays = useMemo(() => WEEKDAYS.filter((d) => schedule[d].enabled), [schedule]);
  const dayOptions = WEEKDAYS.map((d) => ({ value: `${d}` as DayKey, label: weekdayName(d, i18n.language), testId: `profile-day-${d}` }));
  const onDaysChange = (days: readonly DayKey[]) =>
    setSchedule((s) => {
      const next = { ...s };
      for (const d of WEEKDAYS) next[d] = { ...s[d], enabled: days.includes(`${d}` as DayKey) };
      return next;
    });
  const sameForWeekdays = () => {
    const source = WORKDAYS.find((d) => schedule[d].enabled && (schedule[d].out || schedule[d].back));
    if (!source) return;
    const { out, back: backTime } = schedule[source];
    setSchedule((s) => {
      const next = { ...s };
      for (const d of WORKDAYS) if (s[d].enabled) next[d] = { ...s[d], out, back: backTime };
      return next;
    });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    if (selectedDays.length === 0) {
      setDaysError(t('profile.daysError'));
      return;
    }
    setDaysError(undefined);
    save.run();
  };

  return (
    <>
      <TopBar title={t('profile.title')} onBack={back} backLabel={t('nav.back')} />
      <PageBody nav>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={displayName || me.displayName} size="xl" />
              <Input
                id="profile-display-name"
                label={t('profile.displayName')}
                required
                maxLength={40}
                autoComplete="name"
                wrapperClassName="flex-1"
                hint={t('profile.nameHint')}
                error={nameError}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-testid="profile-display-name"
              />
            </div>
          </Card>

          <Card as="section">
            <CardHeader title={t('profile.area')} />
            <div className="mt-3">
              <PlaceSearch id="profile-area" label={t('profile.area')} labelHidden hint={t('profile.areaHint')} country={group.country} value={area} onChange={setArea} />
            </div>
          </Card>

          <Card as="section" className="flex flex-col gap-4">
            <CardHeader title={t('profile.driving')} />
            <Switch label={t('profile.canDrive')} checked={canDrive} onCheckedChange={setCanDrive} data-testid="profile-can-drive" />
            {canDrive && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="profile-seats"
                  label={t('profile.seats')}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={8}
                  required
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  data-testid="profile-seats"
                />
                {usesPlate && (
                  <Input
                    id="profile-plate"
                    label={t('profile.plateLastDigit')}
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.replace(/\D/g, '').slice(0, 1))}
                    data-testid="profile-plate"
                  />
                )}
              </div>
            )}
          </Card>

          <Card as="section" className="flex flex-col gap-4">
            <CardHeader title={t('profile.schedule')} description={t('profile.scheduleHint')} />
            <ChipGroup label={t('profile.weekdays')} options={dayOptions} value={selectedDays.map((d) => `${d}` as DayKey)} onChange={(days) => { setDaysError(undefined); onDaysChange(days); }} showCheck={false} />
            {daysError && (
              <p role="alert" className="text-caption font-medium text-danger-ink">
                {daysError}
              </p>
            )}
            {selectedDays.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-sub font-medium text-ink-2" aria-hidden="true">
                  <span />
                  <span>{t('profile.out')}</span>
                  <span>{t('profile.back')}</span>
                </div>
                {selectedDays.map((d) => {
                  const day = weekdayName(d, i18n.language);
                  return (
                    <div key={d} className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                      <span className="text-sub font-semibold text-ink">{day}</span>
                      <TimeField id={`profile-out-${d}`} label={t('profile.dayOut', { day })} labelHidden icon={false} value={schedule[d].out} onChange={(e) => setDay(d, { out: e.target.value })} data-testid={`profile-out-${d}`} />
                      <TimeField id={`profile-back-${d}`} label={t('profile.dayBack', { day })} labelHidden icon={false} value={schedule[d].back} onChange={(e) => setDay(d, { back: e.target.value })} data-testid={`profile-back-${d}`} />
                    </div>
                  );
                })}
                {selectedDays.filter((d) => WORKDAYS.includes(d)).length > 1 && (
                  <Button type="button" variant="ghost" className="self-start" onClick={sameForWeekdays}>
                    {t('profile.sameForWeekdays')}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <div className="sticky bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px))] -mx-4 mt-2 bg-canvas/92 px-4 py-3 backdrop-blur-md">
            <Button type="submit" size="lg" fullWidth loading={save.busy} loadingLabel={t('profile.saving')} data-testid="profile-save">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </PageBody>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        role="alertdialog"
        title={t('profile.unsavedTitle')}
        description={t('profile.unsavedBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>{t('profile.keepEditing')}</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              {t('profile.leave')}
            </Button>
          </>
        }
      />
    </>
  );
}
