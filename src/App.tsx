import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './app/providers/auth';
import { I18nProvider } from './app/providers/i18n';
import { router } from './app/router';
import { initTheme } from './app/theme';
import { ToastContainer } from './shared/ui';

initTheme();

/** Toasts need the UI language for their dismiss control, so they mount inside the i18n provider. */
function Toasts() {
  const { t } = useTranslation();
  return <ToastContainer dismissLabel={t('common.dismiss')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Toasts />
        <RouterProvider router={router} />
      </I18nProvider>
    </AuthProvider>
  );
}
