import { useTranslation } from 'react-i18next';
import { legalNoticeKey } from '../../domain/policies';
import type { Group } from '../../domain/types';
import { Banner } from '../../shared/ui';

export interface LegalNoticeProps {
  readonly group: Pick<Group, 'country' | 'policy'>;
  /** banner = info wash (wizard, settings); caption = one quiet line at the end of a page (crew detail). */
  readonly variant?: 'banner' | 'caption';
  readonly 'data-testid'?: string;
}

/** The plain legal sentence first, the statute as a caption: plain speech, no citation in the headline. */
export function LegalNotice({ group, variant = 'banner', 'data-testid': testId }: LegalNoticeProps) {
  const { t } = useTranslation();
  const key = legalNoticeKey(group);
  const statute = key === 'legal.kr.rotationOnly' ? t('legal.kr.statute') : null;
  if (variant === 'caption') {
    return (
      <p className="px-1 text-caption text-ink-3" data-testid={testId}>
        {t(key)}
        {statute && ` ${statute}`}
      </p>
    );
  }
  return (
    <Banner variant="info" data-testid={testId}>
      <p>{t(key)}</p>
      {statute && <p className="mt-1 text-caption opacity-80">{statute}</p>}
    </Banner>
  );
}
