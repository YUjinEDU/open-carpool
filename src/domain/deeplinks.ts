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

/** Query parameter a shared invite link carries so the landing can name the group before sign-in. */
export const INVITE_NAME_PARAM = 'name';
const INVITE_NAME_MAX = 80;

/** Bare invite path (what the QR encodes and a typed code resolves to). */
export const invitePath = (code: string): string => `/join/${enc(code)}`;

/** Shared invite path with the group name; the name is display-only and verified after sign-in. */
export const inviteSharePath = (code: string, groupName: string): string =>
  `${invitePath(code)}?${INVITE_NAME_PARAM}=${enc(groupName.trim().slice(0, INVITE_NAME_MAX))}`;

/** The group name a landing may show from its own URL, trimmed and capped. Empty when absent. */
export const inviteNameFrom = (search: URLSearchParams): string => (search.get(INVITE_NAME_PARAM) ?? '').trim().slice(0, INVITE_NAME_MAX);

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
