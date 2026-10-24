import { assertNever } from './assert';

export type InAppBrowser = 'kakaotalk' | 'line' | 'instagram' | 'facebook';
export type Platform = 'ios' | 'android' | 'other';

/** In-app browsers block Google sign-in popups; detect them so the UI can offer "open in browser". */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/KAKAOTALK/i.test(userAgent)) return 'kakaotalk';
  if (/\bLine\/\d/i.test(userAgent)) return 'line';
  if (/Instagram/i.test(userAgent)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(userAgent)) return 'facebook';
  return null;
}

export function detectPlatform(userAgent: string): Platform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  return 'other';
}

function androidChromeIntent(url: string): string {
  return `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
}

/** URL that reopens the page in the system browser, or null when no escape hatch exists. */
export function externalOpenUrl(kind: InAppBrowser | null, url: string, platform: Platform): string | null {
  if (kind === null) return null;
  switch (kind) {
    case 'kakaotalk':
      return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    case 'line': {
      const u = new URL(url);
      u.searchParams.set('openExternalBrowser', '1');
      return u.toString();
    }
    case 'instagram':
    case 'facebook':
      return platform === 'android' ? androidChromeIntent(url) : null;
    default:
      return assertNever(kind);
  }
}
