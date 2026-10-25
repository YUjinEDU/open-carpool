import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { transferOwnership } from '../../data/groups';
import { leaveGroup } from '../../data/members';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Banner, Button, List, ListItem, Sheet, Skeleton, showToast } from '../../shared/ui';
import { useMembers } from '../members/hooks';

export interface TransferOwnershipSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The owner is leaving: transfer first, then leave and go to My groups. */
  readonly leaveAfter: boolean;
}

/** Owner picks an active member as the new owner; the owner becomes an admin (and may then leave). */
export function TransferOwnershipSheet({ open, onClose, leaveAfter }: TransferOwnershipSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { group, me, refresh } = useGroup();
  const [members] = useMembers(group.id);
  const [picked, setPicked] = useState<string | null>(null);
  // Leave mode runs two writes: once the transfer went through, a retry only leaves (V-05).
  const [handedOver, setHandedOver] = useState(false);
  const [leaveFailed, setLeaveFailed] = useState(false);
  const stillOwner = group.ownerId === me.uid && !handedOver;
  const candidates = members.status === 'ready' ? members.data.filter((m) => m.status === 'active' && m.uid !== me.uid) : [];
  const pickedName = candidates.find((m) => m.uid === picked)?.displayName ?? '';
  const close = () => {
    setPicked(null);
    setHandedOver(false);
    setLeaveFailed(false);
    transfer.clearError();
    onClose();
  };
  const transfer = useAction(async () => {
    if (stillOwner) {
      if (picked === null) return;
      await transferOwnership(group.id, me.uid, picked);
      setHandedOver(true);
      showToast(t('settings.transfer.done', { name: pickedName }), 'success');
      refresh();
      if (!leaveAfter) {
        close();
        return;
      }
    }
    setLeaveFailed(false);
    try {
      await leaveGroup(group.id, me.uid);
    } catch (e) {
      setLeaveFailed(true);
      throw e;
    }
    navigate('/', { replace: true });
  }, { report: 'inline' });

  return (
    <Sheet
      open={open}
      onClose={close}
      title={leaveAfter ? t('settings.transfer.leaveTitle') : t('settings.transfer.title')}
      description={leaveAfter ? t('settings.transfer.leaveBody') : t('settings.transfer.body')}
      closeLabel={t('common.close')}
      footer={
        <Button
          fullWidth
          size="lg"
          variant={leaveAfter ? 'danger' : 'primary'}
          disabled={stillOwner && picked === null}
          loading={transfer.busy}
          loadingLabel={t('settings.transfer.busy')}
          onClick={() => transfer.run()}
          data-testid="transfer-confirm"
        >
          {!stillOwner ? t('nav.leaveGroupAction') : leaveAfter ? t('settings.transfer.leaveAction') : t('settings.transfer.action')}
        </Button>
      }
    >
      {members.status === 'loading' && <Skeleton className="h-28" />}
      {members.status === 'error' && <Banner variant="danger">{t('common.loadFailed')}</Banner>}
      {members.status === 'ready' && candidates.length === 0 && <p className="text-sub text-ink-2">{t('settings.transfer.empty')}</p>}
      {candidates.length > 0 && (
        <List inset={false} className="-mx-4">
          {candidates.map((m) => (
            <ListItem
              key={m.uid}
              leading={<Avatar name={m.displayName} size="md" />}
              title={m.displayName}
              description={t(`role.${m.role}`)}
              selected={picked === m.uid}
              trailing={picked === m.uid ? <Check aria-hidden="true" className="size-5" /> : undefined}
              onClick={() => setPicked(m.uid)}
              data-testid={`transfer-pick-${m.uid}`}
            />
          ))}
        </List>
      )}
      {transfer.error && (leaveFailed ? (
        <Banner variant="danger" className="mt-3" title={t('settings.transfer.leaveFailed')} data-testid="transfer-leave-error">
          {transfer.error}
        </Banner>
      ) : (
        <Banner variant="danger" className="mt-3">{transfer.error}</Banner>
      ))}
    </Sheet>
  );
}
