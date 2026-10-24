import { navLinksFor, type NavLink } from '../../domain/deeplinks';
import type { Platform } from '../../domain/inapp';
import type { Group } from '../../domain/types';

export interface NavButton {
  readonly provider: NavLink['provider'];
  /** i18n key of the button label. */
  readonly labelKey: string;
  readonly href: string;
}

/** Navigation buttons to the group destination; empty when the group has no located destination. */
export function navButtonsFor(group: Pick<Group, 'country' | 'destination'>, platform: Platform): NavButton[] {
  if (!group.destination) return [];
  const mobile = platform === 'ios' || platform === 'android';
  return navLinksFor(group.country, group.destination).map((link) => ({
    provider: link.provider,
    labelKey: `nav.provider.${link.provider}`,
    href: mobile && link.appUrl ? link.appUrl : link.webUrl,
  }));
}
