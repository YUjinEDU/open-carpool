import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectPlatform } from '../domain/inapp';

const DISMISSED_KEY = 'oc-ios-install-hint-dismissed';

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && navigator.standalone === true);

/** iOS Safari has no install prompt: show the "Add to Home Screen" hint once. */
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
    <aside data-testid="ios-install-hint">
      <p>{t('pwa.iosHint')}</p>
      <button type="button" onClick={dismiss}>
        {t('common.dismiss')}
      </button>
    </aside>
  );
}
