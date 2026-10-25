import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useGroup } from '../../app/providers/group';
import { deleteGroup } from '../../data/groups';
import { useAction } from '../../shared/lib/useAction';
import { Banner, Button, Dialog, Input, showToast } from '../../shared/ui';

/** Owner only: deletes the group and all its data once the exact group name is typed. */
export function DeleteGroupDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { group, me } = useGroup();
  const [typed, setTyped] = useState('');
  const confirmed = typed.trim() === group.name;
  const close = () => {
    setTyped('');
    remove.clearError();
    onClose();
  };
  const remove = useAction(async () => {
    await deleteGroup(group, me.uid);
    showToast(t('settings.deleteGroup.done'), 'info');
    navigate('/', { replace: true });
  }, { report: 'inline' });

  return (
    <Dialog
      open={open}
      onClose={close}
      role="alertdialog"
      title={t('settings.deleteGroup.title')}
      description={t('settings.deleteGroup.body')}
      actions={
        <>
          <Button variant="secondary" onClick={close}>{t('common.cancel')}</Button>
          <Button
            variant="danger"
            disabled={!confirmed}
            loading={remove.busy}
            loadingLabel={t('settings.deleteGroup.busy')}
            onClick={() => remove.run()}
            data-testid="group-delete-confirm"
          >
            {t('settings.deleteGroup.action')}
          </Button>
        </>
      }
    >
      <Input
        id="group-delete-name"
        label={t('settings.deleteGroup.confirmLabel')}
        hint={t('settings.deleteGroup.confirmHint', { name: group.name })}
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        data-testid="group-delete-name"
      />
      {remove.error && <Banner variant="danger" className="mt-3">{remove.error}</Banner>}
    </Dialog>
  );
}
