import type { CountryCode, LatLng } from './types';

export type NavProvider = 'naver' | 'kakao' | 'google';

export interface NavDestination extends LatLng {
  readonly label: string;
}

export interface NavLink {
  readonly provider: NavProvider;
  /** Custom-scheme URL opening the native app; null when the web URL already hands off to the app. */
  readonly appUrl: string | null;
  readonly webUrl: string;
}

const APP_NAME = 'org.opencarpool';
const enc = encodeURIComponent;

export function naverLink({ lat, lng, label }: NavDestination): NavLink {
  return {
    provider: 'naver',
    appUrl: `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${enc(label)}&appname=${APP_NAME}`,
    webUrl: `https://map.naver.com/index.nhn?elat=${lat}&elng=${lng}&etext=${enc(label)}&menu=route&pathType=0`,
  };
}

export function kakaoLink({ lat, lng, label }: NavDestination): NavLink {
  return {
    provider: 'kakao',
    appUrl: `kakaomap://route?ep=${lat},${lng}&by=CAR`,
    webUrl: `https://map.kakao.com/link/to/${enc(label)},${lat},${lng}`,
  };
}

export function googleLink({ lat, lng }: NavDestination): NavLink {
  return {
    provider: 'google',
    appUrl: null,
    webUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  };
}

/** Navigation links in the order users of that country expect (KR: Naver, Kakao, Google). */
export function navLinksFor(country: CountryCode, dest: NavDestination): NavLink[] {
  return country.trim().toUpperCase() === 'KR'
    ? [naverLink(dest), kakaoLink(dest), googleLink(dest)]
    : [googleLink(dest), naverLink(dest), kakaoLink(dest)];
}
