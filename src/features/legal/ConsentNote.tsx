import { Trans } from 'react-i18next';
import { Link } from 'react-router';
import { cx } from '../../shared/ui';

const LINK = 'text-accent-ink underline underline-offset-2';

/** The consent sentence under sign-in, with the two documents linked (they open in-app, signed out too). */
export function ConsentNote({ className }: { readonly className?: string }) {
  return (
    <p className={cx('text-center text-caption text-ink-3', className)} data-testid="consent-note">
      <Trans
        i18nKey="ux2.legal.consent"
        components={{
          terms: <Link to="/legal/terms" className={LINK} />,
          privacy: <Link to="/legal/privacy" className={LINK} />,
        }}
      />
    </p>
  );
}
