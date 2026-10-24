import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { showToast } from '../../components/Toast';
import { updateMyMember } from '../../data/members';
import type { Weekday } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { roundLatLng, type Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { fromDraft, toDraft, weekdayName, WEEKDAYS, type DayDraft, type ScheduleDraft } from './schedule';

/** My member profile in the current group. */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { group, me, refresh } = useGroup();
  const [displayName, setDisplayName] = useState(me.displayName);
  const [canDrive, setCanDrive] = useState(me.canDrive);
  const [seats, setSeats] = useState(me.seats || 3);
  const [plate, setPlate] = useState(me.plateLastDigit === null ? '' : String(me.plateLastDigit));
  const [area, setArea] = useState<Place | null>(me.areaLabel ? { label: me.areaLabel, point: me.area } : null);
  const [schedule, setSchedule] = useState<ScheduleDraft>(() => toDraft(me.schedule));
  const usesPlate = group.policy.plateRotation !== 'none';

  const save = useAction(async () => {
    await updateMyMember(group.id, me.uid, {
      displayName: displayName.trim(),
      canDrive,
      seats: canDrive ? seats : 0,
      plateLastDigit: usesPlate && plate !== '' ? Number(plate) : me.plateLastDigit,
      areaLabel: area?.label ?? '',
      area: area?.point ? roundLatLng(area.point) : null,
      schedule: fromDraft(schedule),
    });
    refresh();
    showToast(t('common.saved'), 'success');
  });

  const setDay = (d: Weekday, patch: Partial<DayDraft>) => setSchedule((s) => ({ ...s, [d]: { ...s[d], ...patch } }));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.run();
  };

  return (
    <main className="p-4">
      <h1>{t('profile.title')}</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="profile-display-name">{t('profile.displayName')}</label>
        <input
          id="profile-display-name"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          data-testid="profile-display-name"
        />
        <input
          id="profile-can-drive"
          type="checkbox"
          checked={canDrive}
          onChange={(e) => setCanDrive(e.target.checked)}
          data-testid="profile-can-drive"
        />
        <label htmlFor="profile-can-drive">{t('profile.canDrive')}</label>
        {canDrive && (
          <>
            <label htmlFor="profile-seats">{t('profile.seats')}</label>
            <input
              id="profile-seats"
              type="number"
              min={1}
              max={8}
              required
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              data-testid="profile-seats"
            />
          </>
        )}
        {usesPlate && (
          <>
            <label htmlFor="profile-plate">{t('profile.plateLastDigit')}</label>
            <input
              id="profile-plate"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={1}
              value={plate}
              onChange={(e) => setPlate(e.target.value.replace(/\D/g, '').slice(0, 1))}
              data-testid="profile-plate"
            />
          </>
        )}
        <PlaceSearch id="profile-area" label={t('profile.area')} country={group.country} value={area} onChange={setArea} />
        <p>{t('profile.areaHint')}</p>
        <fieldset>
          <legend>{t('profile.schedule')}</legend>
          {WEEKDAYS.map((d) => (
            <div key={d}>
              <input
                id={`profile-day-${d}`}
                type="checkbox"
                checked={schedule[d].enabled}
                onChange={(e) => setDay(d, { enabled: e.target.checked })}
                data-testid={`profile-day-${d}`}
              />
              <label htmlFor={`profile-day-${d}`}>{weekdayName(d, i18n.language)}</label>
              {schedule[d].enabled && (
                <>
                  <label htmlFor={`profile-out-${d}`}>{t('profile.out')}</label>
                  <input
                    id={`profile-out-${d}`}
                    type="time"
                    value={schedule[d].out}
                    onChange={(e) => setDay(d, { out: e.target.value })}
                    data-testid={`profile-out-${d}`}
                  />
                  <label htmlFor={`profile-back-${d}`}>{t('profile.back')}</label>
                  <input
                    id={`profile-back-${d}`}
                    type="time"
                    value={schedule[d].back}
                    onChange={(e) => setDay(d, { back: e.target.value })}
                    data-testid={`profile-back-${d}`}
                  />
                </>
              )}
            </div>
          ))}
        </fieldset>
        <button type="submit" disabled={save.busy} data-testid="profile-save">
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
