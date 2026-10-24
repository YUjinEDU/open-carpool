import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './app/providers/auth';
import { I18nProvider } from './app/providers/i18n';
import { router } from './app/router';
import { initTheme } from './app/theme';
import { ToastContainer } from './shared/ui';

initTheme();

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <ToastContainer />
        <RouterProvider router={router} />
      </I18nProvider>
    </AuthProvider>
  );
}
