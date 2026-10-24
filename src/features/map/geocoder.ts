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
