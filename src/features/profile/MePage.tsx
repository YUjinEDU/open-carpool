import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { clearDigestOptIn, digestOptIn, notificationState, requestDigestOptIn } from '../../app/notifications';
import { useAuth } from '../../app/providers/auth';
import { useSession } from '../../app/providers/session';
import { PageBody } from '../../app/shell/PageBody';
import { useBack } from '../../app/shell/useBack';
import { readThemePreference, setThemePreference, type ThemePreference } from '../../app/theme';
import type { Locale } from '../../domain/types';
import { LOCALES } from '../../shared/i18n';
import { useAction } from '../../shared/lib/useAction';
import { Avatar, Button, Card, CardHeader, Input, SegmentedControl, Switch, TopBar, showToast } from '../../shared/ui';
import { signOut } from '../auth/authService';

/** Account settings shared by every group: name, language, theme, reminders, sign out. */
export function MePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = useBack('/');
  const { saveProfile } = useAuth();
  const { profile } = useSession();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [locale, setLocale] = useState<Locale>(profile.locale);
  const [theme, setTheme] = useState<ThemePreference>(() => readThemePreference());
  const [notify, setNotify] = useState(() => digestOptIn());
  const [permission, setPermission] = useState(() => notificationState());

  const save = useAction(async () => {
    await saveProfile({ ...profile, displayName: displayName.trim(), locale });
    showToast(t('common.saved'), 'success');
  });
  const leave = useAction(async () => {
    await signOut();
    navigate('/signin', { replace: true });
  });
  const toggleNotify = async (on: boolean) => {
    if (!on) {
      clearDigestOptIn();
      setNotify(false);
      return;
    }
    const granted = await requestDigestOptIn();
    setPermission(notificationState());
    setNotify(granted);
  };
  const changeTheme = (next: ThemePreference) => {
    setTheme(next);
    setThemePreference(next);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.run();
  };

  return (
    <>
      <TopBar title={t('me.title')} onBack={back} backLabel={t('nav.back')} />
      <PageBody>
        <Card as="section">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={displayName || profile.displayName} src={profile.photoURL} size="xl" />
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-ink">{profile.displayName}</p>
                <p className="truncate text-sub text-ink-2" data-testid="me-email">
                  {profile.email}
                </p>
              </div>
            </div>
            <Input
              id="me-display-name"
              label={t('me.displayName')}
              required
              maxLength={40}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="me-display-name"
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-sub font-medium text-ink-2">{t('me.locale')}</p>
              <SegmentedControl<Locale>
                label={t('me.locale')}
                options={LOCALES.map((l) => ({ value: l, label: t(`locale.${l}`) }))}
                value={locale}
                onChange={setLocale}
                testId="me-locale"
              />
            </div>
            <Button type="submit" loading={save.busy} loadingLabel={t('me.saving')} className="self-start" data-testid="me-save">
              {t('common.save')}
            </Button>
          </form>
        </Card>

        <Card as="section" className="flex flex-col gap-3">
          <CardHeader title={t('me.theme')} />
          <SegmentedControl
            label={t('me.theme')}
            options={[
              { value: 'system', label: t('me.themeSystem') },
              { value: 'light', label: t('me.themeLight') },
              { value: 'dark', label: t('me.themeDark') },
            ]}
            value={theme}
            onChange={changeTheme}
            testId="me-theme"
          />
        </Card>

        <Card as="section" className="flex flex-col gap-3">
          <CardHeader title={t('me.notifications')} />
          <Switch
            label={t('me.notifyOptIn')}
            description={permission === 'unsupported' ? t('me.notifyUnsupported') : permission === 'denied' ? t('me.notifyDenied') : t('me.notifyHint')}
            checked={notify}
            disabled={permission === 'unsupported' || permission === 'denied'}
            onCheckedChange={(on) => void toggleNotify(on)}
            data-testid="me-notify"
          />
        </Card>

        <Button variant="secondary" leadingIcon={<LogOut />} loading={leave.busy} loadingLabel={t('me.signingOut')} onClick={() => leave.run()} className="self-start" data-testid="signout">
          {t('me.signOut')}
        </Button>
      </PageBody>
    </>
  );
}
