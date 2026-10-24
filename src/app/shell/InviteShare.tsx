import { useTranslation } from 'react-i18next';
import type { Group } from '../../domain/types';
import { invitePath, inviteSharePath } from '../../domain/deeplinks';
import { QrCode, ShareButtons, Sheet, showToast } from '../../shared/ui';

export interface InviteShareProps {
  readonly group: Pick<Group, 'name' | 'inviteCode'>;
  /** Only one surface per page should carry the invite test ids (the settings card, or the post-create sheet). */
  readonly withTestIds?: boolean;
}

/** Bare link: what the QR encodes (dense enough already) and what a typed code resolves to. */
export const inviteLink = (code: string): string => `${window.location.origin}${invitePath(code)}`;
/** Shared link: carries the group name so the landing can say who invited the visitor before sign-in. */
export const inviteShareLink = (code: string, groupName: string): string => `${window.location.origin}${inviteSharePath(code, groupName)}`;

/** QR + code block, copy / Web Share buttons and the plain link. */
export function InviteShare({ group, withTestIds = false }: InviteShareProps) {
  const { t } = useTranslation();
  const link = inviteShareLink(group.inviteCode, group.name);
  const ids = withTestIds ? { copy: 'invite-copy', share: 'invite-share', qr: 'invite-qr' } : undefined;
  return (
    <div className="flex flex-col gap-3">
      <ShareButtons
        url={link}
        title={group.name}
        text={t('invite.shareText', { name: group.name })}
        labels={{ copy: t('invite.copy'), copied: t('invite.copied'), share: t('invite.share') }}
        qr={<QrCode value={inviteLink(group.inviteCode)} label={t('invite.qrLabel')} />}
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
  readonly title?: string;
  readonly description?: string;
  readonly withTestIds?: boolean;
}

export function InviteSheet({ open, onClose, group, title, description, withTestIds = false }: InviteSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose} title={title ?? t('invite.title')} description={description ?? t('invite.hint')} closeLabel={t('common.close')}>
      {open && <InviteShare group={group} withTestIds={withTestIds} />}
    </Sheet>
  );
}
