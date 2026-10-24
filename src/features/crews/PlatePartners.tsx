import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { plateComplementPairs } from '../../domain/pairs';
import type { Group, Member } from '../../domain/types';
import { Avatar, Card, CardHeader, EmptyState, List, ListItem } from '../../shared/ui';

const MAX_PARTNERS = 5;

export interface PlatePartnersProps {
  readonly group: Pick<Group, 'policy'>;
  readonly members: readonly Member[];
  readonly me: Member;
}

/**
 * "Plate partners": drivers whose plate last digit complements mine under the group's plate
 * rotation, nearest and best schedule match first. Renders nothing when the group has no rotation.
 */
export function PlatePartners({ group, members, me }: PlatePartnersProps) {
  const { t } = useTranslation();
  const rotation = group.policy.plateRotation;
  const partners = useMemo(
    () =>
      plateComplementPairs(members, rotation)
        .filter((p) => p.memberIds.includes(me.uid))
        .slice(0, MAX_PARTNERS)
        .flatMap((pair) => {
          const other = members.find((m) => m.uid === (pair.memberIds[0] === me.uid ? pair.memberIds[1] : pair.memberIds[0]));
          return other ? [{ pair, other }] : [];
        }),
    [members, rotation, me.uid],
  );
  if (rotation === 'none') return null;

  return (
    <Card as="section" padding="none" aria-label={t('platePartners.title')} data-testid="plate-partners">
      <CardHeader className="p-4 pb-3" title={t('platePartners.title')} description={t(rotation === 'odd-even' ? 'platePartners.oddEven' : 'platePartners.fiveDay')} />
      {me.plateLastDigit === null || !me.canDrive ? (
        <EmptyState compact icon={<Users />} title={t('platePartners.needsPlate')} />
      ) : partners.length === 0 ? (
        <EmptyState compact icon={<Users />} title={t('platePartners.empty')} />
      ) : (
        <List inset={false} className="border-t border-line">
          {partners.map(({ pair, other }) => (
            <ListItem
              key={other.uid}
              leading={<Avatar name={other.displayName} />}
              title={<span data-testid={`plate-partner-${other.uid}`}>{other.displayName}</span>}
              description={[
                t('platePartners.plates', { a: me.plateLastDigit, b: other.plateLastDigit }),
                t('suggest.reason.nearby', { km: Math.round(pair.km * 10) / 10 }),
                t('suggest.reason.schedule', { matches: pair.overlap }),
              ].join(' · ')}
            />
          ))}
        </List>
      )}
    </Card>
  );
}
