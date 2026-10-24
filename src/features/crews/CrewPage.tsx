import { useTranslation } from 'react-i18next';

/** Placeholder: weekly plan, rotation and ledger for one crew land in U4. */
export function CrewPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1>{t('crew.title')}</h1>
      <p>{t('common.comingSoon')}</p>
    </main>
  );
}
