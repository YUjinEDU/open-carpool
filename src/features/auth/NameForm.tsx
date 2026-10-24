import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app/providers/auth';
import { useAction } from '../../shared/lib/useAction';
import { Banner, Button, Input } from '../../shared/ui';
import { isDefaultDisplayName } from './authService';

export interface NameFormProps {
  /** Runs after the name was saved on the account and in every membership. */
  readonly onSaved?: () => void;
  readonly submitLabel?: string;
}

/**
 * One field: the name the group will see. Shown on first sign-in (RequireAuth) and on the invite landing
 * before joining, so the placeholder name never reaches a member document.
 */
export function NameForm({ onSaved, submitLabel }: NameFormProps) {
  const { t } = useTranslation();
  const { profile, rename } = useAuth();
  const [name, setName] = useState(profile && !isDefaultDisplayName(profile.displayName) ? profile.displayName : '');
  const [touched, setTouched] = useState(false);
  const invalid = name.trim() === '' ? t('auth.nameError') : isDefaultDisplayName(name) ? t('auth.nameDefaultError') : undefined;
  const save = useAction(async () => {
    await rename(name.trim());
    onSaved?.();
  }, { report: 'inline' });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!invalid) save.run();
  };
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="name-prompt">
      <Input
        id="name-prompt-name"
        label={t('auth.nameLabel')}
        required
        maxLength={40}
        autoComplete="name"
        autoFocus
        error={touched ? invalid : undefined}
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="name-prompt-input"
      />
      {save.error && <Banner variant="danger">{save.error}</Banner>}
      <Button type="submit" size="lg" fullWidth loading={save.busy} loadingLabel={t('auth.nameSaving')} data-testid="name-prompt-submit">
        {submitLabel ?? t('common.continue')}
      </Button>
    </form>
  );
}
