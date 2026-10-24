import { useTranslation } from 'react-i18next';

/** Placeholder: the event ride board lands in U6. */
export function EventsPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1>{t('events.title')}</h1>
      <p>{t('common.comingSoon')}</p>
    </main>
  );
}
