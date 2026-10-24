import { useTranslation } from 'react-i18next';
import type { Group } from '../../domain/types';
import { QrCode, ShareButtons, Sheet, showToast } from '../../shared/ui';

export interface InviteShareProps {
  readonly group: Pick<Group, 'name' | 'inviteCode'>;
  /** Only one surface per page should carry the invite test ids (the settings card). */
  readonly withTestIds?: boolean;
}

export const inviteLink = (code: string): string => `${window.location.origin}/join/${code}`;

/** QR + code block, copy / Web Share buttons and the plain link. */
export function InviteShare({ group, withTestIds = false }: InviteShareProps) {
  const { t } = useTranslation();
  const link = inviteLink(group.inviteCode);
  const ids = withTestIds ? { copy: 'invite-copy', share: 'invite-share', qr: 'invite-qr' } : undefined;
  return (
    <div className="flex flex-col gap-3">
      <ShareButtons
        url={link}
        title={group.name}
        text={t('invite.shareText', { name: group.name })}
        labels={{ copy: t('invite.copy'), copied: t('invite.copied'), share: t('invite.share') }}
        qr={<QrCode value={link} label={t('invite.qrLabel')} />}
        code={<span data-testid={withTestIds ? 'invite-code' : undefined}>{group.inviteCode}</span>}
        testIds={ids}
        onCopied={() => showToast(t('invite.copied'), 'success')}
      />
      <p className="text-caption text-ink-3">
        {t('invite.link')}:{' '}
        <a href={link} className="wrap-anywhere text-accent-ink underline-offset-2 hover:underline" data-testid={withTestIds ? 'invite-link' : undefined}>
          {link}
        </a>
      </p>
    </div>
  );
}

export interface InviteSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly group: Pick<Group, 'name' | 'inviteCode'>;
}

export function InviteSheet({ open, onClose, group }: InviteSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose} title={t('invite.title')} description={t('invite.hint')} closeLabel={t('common.close')}>
      {open && <InviteShare group={group} />}
    </Sheet>
  );
}
