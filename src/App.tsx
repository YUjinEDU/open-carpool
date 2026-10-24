import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './app/providers/auth';
import { I18nProvider } from './app/providers/i18n';
import { router } from './app/router';
import { ToastContainer } from './components/Toast';

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
