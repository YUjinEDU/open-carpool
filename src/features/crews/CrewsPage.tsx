import { useTranslation } from 'react-i18next';

/** Placeholder: crew suggestion / creation lands in U4. */
export function CrewsPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1>{t('crews.title')}</h1>
      <p>{t('common.comingSoon')}</p>
    </main>
  );
}
