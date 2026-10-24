import { assertNever } from '../../domain/assert';
import type { CountryCode, LatLng } from '../../domain/types';
import { config, type AppConfig } from '../../shared/config';
import { loadGoogleGeocoder } from './googleMaps';

/** A geocoding hit. Manual entries carry NaN coordinates: a label without a location. */
export interface GeocodeResult {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

export interface GeocodeProvider {
  geocode(query: string): Promise<GeocodeResult[]>;
}

/** What the app stores for a chosen place; `point` is null for label-only (manual) entries. */
export interface Place {
  readonly label: string;
  readonly point: LatLng | null;
}

export class GeocodeError extends Error {
  constructor(readonly status: number) {
    super(`geocoding failed with HTTP ${status}`);
    this.name = 'GeocodeError';
  }
}

/** Coarse location (~100 m) for member home areas: 3 decimals. */
export const roundCoord = (value: number): number => Math.round(value * 1000) / 1000;
export const roundLatLng = ({ lat, lng }: LatLng): LatLng => ({ lat: roundCoord(lat), lng: roundCoord(lng) });

/** Korean administrative units, largest to smallest; a road address stops being coarse at the road name. */
const ADMIN_UNIT = /(특별시|광역시|특별자치시|특별자치도|도|시|군|구|동|읍|면|리|\d가)$/;
const DONG_LEVEL = /(동|읍|면|리|\d가)$/;
const ROAD = /(대로|로|길)$/;
const hasDigit = (token: string): boolean => /\d/.test(token);

/**
 * S-04: the only form of a home address other members may see. A Korean address keeps its administrative
 * units (시/도, 시/군/구, 동/읍/면/리; the 법정동 in a road address's parentheses counts) and drops the road
 * name, building number and building name. A comma-separated (Google) address drops every component that
 * carries a number (house number, postal code). Anything else is cut at its first number. Idempotent, so
 * labels stored before this rule existed are coarsened the same way when displayed.
 */
export function coarseLabel(label: string): string {
  const trimmed = label.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const paren = /\(([^)]*)\)/.exec(trimmed);
  const parenDong = (paren?.[1] ?? '').split(',')[0]?.trim() ?? '';
  const body = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (body.includes(',')) {
    return body
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !hasDigit(part))
      .join(', ');
  }
  const tokens = body.split(' ');
  const cut = tokens.findIndex((token) => ROAD.test(token) || (hasDigit(token) && !ADMIN_UNIT.test(token)));
  const kept = cut === -1 ? tokens : cut === 0 ? tokens.filter((token) => !hasDigit(token)) : tokens.slice(0, cut);
  if (DONG_LEVEL.test(parenDong) && !kept.some((token) => DONG_LEVEL.test(token))) kept.push(parenDong);
  return kept.join(' ');
}

export const toPlace = ({ label, lat, lng }: GeocodeResult): Place => ({
  label,
  point: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Parse the Naver geocode v2 response (`addresses[].{roadAddress,jibunAddress,x,y}`). */
export function parseNaverGeocode(body: unknown): GeocodeResult[] {
  if (!isRecord(body) || !Array.isArray(body.addresses)) return [];
  return body.addresses.flatMap((a: unknown) => {
    if (!isRecord(a)) return [];
    const label = str(a.roadAddress) || str(a.jibunAddress);
    const lat = Number(a.y);
    const lng = Number(a.x);
    return label && Number.isFinite(lat) && Number.isFinite(lng) ? [{ label, lat, lng }] : [];
  });
}

export const NaverGeocoder: GeocodeProvider = {
  async geocode(query) {
    // The proxy requires the caller's Firebase ID token (api/naver/_auth.ts). Lazy import keeps
    // Firebase out of this module's import graph for unit tests.
    const { auth } = await import('../../firebase');
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`/api/naver/geocode?query=${encodeURIComponent(query)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new GeocodeError(res.status);
    return parseNaverGeocode(await res.json());
  },
};

export const googleGeocoder = (apiKey: string): GeocodeProvider => ({
  async geocode(query) {
    const geocoder = await loadGoogleGeocoder(apiKey);
    const { results } = await geocoder.geocode({ address: query });
    return results.map((r) => ({
      label: r.formatted_address,
      lat: r.geometry.location.lat(),
      lng: r.geometry.location.lng(),
    }));
  },
});

export const ManualGeocoder: GeocodeProvider = {
  async geocode(query) {
    const label = query.trim();
    return label ? [{ label, lat: Number.NaN, lng: Number.NaN }] : [];
  },
};

export type GeocoderKind = 'naver' | 'google' | 'manual';
type MapKeys = Pick<AppConfig, 'naverClientId' | 'googleMapsApiKey'>;

/** KR uses Naver, everywhere else Google; without the key the user types a label only. */
export function geocoderKindFor(country: CountryCode, keys: MapKeys): GeocoderKind {
  if (country.trim().toUpperCase() === 'KR') return keys.naverClientId ? 'naver' : 'manual';
  return keys.googleMapsApiKey ? 'google' : 'manual';
}

export function geocoderFor(country: CountryCode, keys: MapKeys = config): GeocodeProvider {
  const kind = geocoderKindFor(country, keys);
  switch (kind) {
    case 'naver':
      return NaverGeocoder;
    case 'google':
      return googleGeocoder(keys.googleMapsApiKey);
    case 'manual':
      return ManualGeocoder;
    default:
      return assertNever(kind);
  }
}
