import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';

/** Placeholder: the admin dashboard lands in U5. */
export function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin } = useGroup();
  return (
    <main className="p-4">
      <h1>{t('admin.title')}</h1>
      <p>{isAdmin ? t('common.comingSoon') : t('common.adminsOnly')}</p>
    </main>
  );
}
