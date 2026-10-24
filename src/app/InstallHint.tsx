import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'lucide-react';
import { detectPlatform } from '../domain/inapp';
import { Banner } from '../shared/ui';

const DISMISSED_KEY = 'oc-ios-install-hint-dismissed';

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && navigator.standalone === true);

/** iOS Safari has no install prompt: show the "Add to Home Screen" hint once, above the tab bar. */
export function InstallHint() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(
    () => detectPlatform(navigator.userAgent) === 'ios' && !isStandalone() && !localStorage.getItem(DISMISSED_KEY),
  );
  if (!visible) return null;
  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] z-40 mx-auto w-full max-w-md px-4">
      <Banner
        variant="info"
        icon={<Share />}
        title={t('pwa.iosTitle')}
        onDismiss={dismiss}
        dismissLabel={t('common.dismiss')}
        className="pointer-events-auto shadow-float"
        data-testid="ios-install-hint"
      >
        {t('pwa.iosHint')}
      </Banner>
    </div>
  );
}
