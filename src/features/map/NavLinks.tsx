import { useTranslation } from 'react-i18next';
import { detectPlatform } from '../../domain/inapp';
import type { Group } from '../../domain/types';
import { navButtonsFor } from './navButtons';

/** Deep links (Naver / Kakao / Google) to the group destination. */
export function NavLinks({ group }: { readonly group: Pick<Group, 'country' | 'destination'> }) {
  const { t } = useTranslation();
  const buttons = navButtonsFor(group, detectPlatform(navigator.userAgent));
  if (buttons.length === 0) return null;
  return (
    <ul aria-label={t('nav.provider.title')}>
      {buttons.map((b) => (
        <li key={b.provider}>
          <a href={b.href} target="_blank" rel="noreferrer" data-testid={`nav-link-${b.provider}`}>
            {t(b.labelKey)}
          </a>
        </li>
      ))}
    </ul>
  );
}
