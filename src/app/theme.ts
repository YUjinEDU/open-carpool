/** Light / dark / system preference. Dark is opt-in via data-theme="dark" on <html> (see src/index.css). */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_KEY = 'oc-theme';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const isPreference = (v: string | null): v is ThemePreference => THEME_PREFERENCES.some((p) => p === v);

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

const systemDark = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && systemDark());
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    /* private mode: the choice lasts for this page load */
  }
  applyTheme(preference);
}

/** Apply the stored preference now and follow the OS while "system" is selected. */
export function initTheme(): void {
  applyTheme(readThemePreference());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePreference() === 'system') applyTheme('system');
  });
}
