import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import { detectPlatform } from '../../domain/inapp';
import type { Group } from '../../domain/types';
import { Button } from '../../shared/ui';
import { navButtonsFor } from './navButtons';

/** Deep links (Naver / Kakao / Google) to the group destination, as a cluster of small secondary buttons. */
export function NavLinks({ group, size = 'sm' }: { readonly group: Pick<Group, 'country' | 'destination'>; readonly size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const buttons = navButtonsFor(group, detectPlatform(navigator.userAgent));
  if (buttons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('nav.provider.title')}>
      {buttons.map((b) => (
        <Button
          key={b.provider}
          variant="secondary"
          size={size}
          leadingIcon={<Navigation />}
          onClick={() => window.open(b.href, '_blank', 'noopener,noreferrer')}
          data-testid={`nav-link-${b.provider}`}
        >
          {t(b.labelKey)}
        </Button>
      ))}
    </div>
  );
}
