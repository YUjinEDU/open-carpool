import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, UserX } from 'lucide-react';
import { assertNever } from '../../domain/assert';
import type { Trip } from '../../domain/types';
import { Badge } from '../../shared/ui';

export interface TripStatusBadgeProps {
  readonly trip: Pick<Trip, 'status' | 'applied' | 'absentIds'>;
  /** When set and listed as absent on an open trip, the badge says so instead of the plan status. */
  readonly meUid?: string;
  readonly size?: 'sm' | 'md';
}

/** Status mapping from DESIGN.md: planned neutral, needs_driver warn, done success, cancelled neutral, absent neutral. */
export function TripStatusBadge({ trip, meUid, size = 'sm' }: TripStatusBadgeProps) {
  const { t } = useTranslation();
  const open = trip.status === 'planned' || trip.status === 'needs_driver';
  if (open && meUid && trip.absentIds.includes(meUid)) {
    return (
      <Badge size={size} icon={<UserX />}>
        {t('trip.absentBadge')}
      </Badge>
    );
  }
  switch (trip.status) {
    case 'planned':
      return <Badge size={size}>{t('trip.status.planned')}</Badge>;
    case 'needs_driver':
      return (
        <Badge size={size} variant="warn" icon={<AlertTriangle />}>
          {t('trip.status.needs_driver')}
        </Badge>
      );
    case 'done':
      return (
        <Badge size={size} variant="success" icon={<Check />} data-testid={trip.applied ? 'trip-completed' : undefined}>
          {t('trip.status.done')}
        </Badge>
      );
    case 'cancelled':
      return <Badge size={size}>{t('trip.status.cancelled')}</Badge>;
    default:
      return assertNever(trip.status);
  }
}
