import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Crew, Trip } from '../../domain/types';
import { formatDate } from '../../shared/lib/format';
import { Avatar, Button, Checkbox, Sheet } from '../../shared/ui';
import { legTime } from './nextTrip';

export interface CompleteSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly crew: Crew;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
  readonly meUid: string;
  readonly busy: boolean;
  readonly onConfirm: (riderIds: string[]) => void;
}

/** "Who rode?" bottom sheet: present riders pre-checked, absent members last and unchecked. */
export function CompleteSheet({ open, onClose, crew, trip, names, meUid, busy, onConfirm }: CompleteSheetProps) {
  const { t, i18n } = useTranslation();
  const [riders, setRiders] = useState<readonly string[]>(trip.riderIds);
  useEffect(() => {
    if (open) setRiders(trip.riderIds);
  }, [open, trip.riderIds]);

  const name = (uid: string) => names.get(uid) ?? uid;
  const roster = crew.memberIds
    .filter((uid) => uid !== trip.driverId)
    .map((uid) => ({ uid, name: name(uid), absent: trip.absentIds.includes(uid) }))
    .sort((a, b) => Number(a.absent) - Number(b.absent));
  const toggle = (uid: string, rode: boolean) =>
    setRiders((prev) => (rode ? [...new Set([...prev, uid])] : prev.filter((id) => id !== uid)));
  const driverName = trip.driverId ? name(trip.driverId) : '';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('trip.doneTitle')}
      description={t('trip.doneDescription')}
      closeLabel={t('common.close')}
      footer={
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth loading={busy} loadingLabel={t('trip.recording')} onClick={() => onConfirm([...riders])} data-testid="trip-done-confirm">
            {t('trip.record')}
          </Button>
          <p className="text-center text-caption text-ink-3">{t('trip.recordHint')}</p>
        </div>
      }
    >
      <div data-testid="trip-done-panel">
        <div className="flex items-center gap-3 rounded-card bg-surface-2 px-4 py-3">
          <Avatar name={driverName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sub font-medium text-ink">{t('trip.doneSummary', { name: driverName })}</p>
            <p className="text-caption text-ink-3">
              {formatDate(trip.date, i18n.language)} <span className="tabular-nums">{legTime(crew, trip.leg)}</span> {t(`trip.leg.${trip.leg}`)}
            </p>
          </div>
          <span className="shrink-0 text-sub font-semibold tabular-nums text-ink-2">{t('trip.ridersCount', { count: riders.length })}</span>
        </div>
        <ul role="list" className="mt-2 divide-y divide-line">
          {roster.map((r) => (
            <li key={r.uid} className="flex items-center gap-3">
              <Avatar name={r.name} size="sm" />
              <Checkbox
                boxPosition="end"
                wrapperClassName="flex-1"
                label={r.uid === meUid ? `${r.name} (${t('common.me')})` : r.name}
                description={r.absent ? t('trip.absentBadge') : undefined}
                checked={riders.includes(r.uid)}
                onChange={(e) => toggle(r.uid, e.target.checked)}
                data-testid={`trip-done-rider-${r.uid}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
