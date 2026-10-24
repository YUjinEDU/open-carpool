import { describe, expect, it } from 'vitest';
import { geocoderFor, geocoderKindFor, ManualGeocoder, NaverGeocoder, parseNaverGeocode, roundLatLng, toPlace } from './geocoder';

const noKeys = { naverClientId: '', googleMapsApiKey: '' };
const allKeys = { naverClientId: 'naver-id', googleMapsApiKey: 'google-key' };

describe('geocoderKindFor', () => {
  it('uses Naver for KR when the Naver client id is set', () => {
    expect(geocoderKindFor('kr', allKeys)).toBe('naver');
  });

  it('falls back to manual entry for KR without a Naver client id', () => {
    expect(geocoderKindFor('KR', { ...allKeys, naverClientId: '' })).toBe('manual');
  });

  it('uses Google outside KR when the Google key is set', () => {
    expect(geocoderKindFor('US', allKeys)).toBe('google');
  });

  it('falls back to manual entry outside KR without a Google key', () => {
    expect(geocoderKindFor('JP', { ...allKeys, googleMapsApiKey: '' })).toBe('manual');
  });

  it('returns the matching provider instance', () => {
    expect(geocoderFor('KR', allKeys)).toBe(NaverGeocoder);
    expect(geocoderFor('US', noKeys)).toBe(ManualGeocoder);
  });
});

describe('coordinates', () => {
  it('rounds stored coordinates to 3 decimals', () => {
    expect(roundLatLng({ lat: 36.36789, lng: 127.34449 })).toEqual({ lat: 36.368, lng: 127.344 });
  });

  it('turns a manual entry into a label-only place', async () => {
    const [hit] = await ManualGeocoder.geocode('  Main St office ');
    expect(toPlace(hit)).toEqual({ label: 'Main St office', point: null });
  });
});

describe('parseNaverGeocode', () => {
  it('maps addresses to label + lat/lng and drops unusable rows', () => {
    const body = {
      addresses: [
        { roadAddress: '서울특별시 중구 세종대로 110', jibunAddress: 'x', x: '126.9779', y: '37.5663' },
        { roadAddress: '', jibunAddress: '', x: '1', y: '2' },
        { roadAddress: 'no coords', x: 'abc', y: '' },
      ],
    };
    expect(parseNaverGeocode(body)).toEqual([{ label: '서울특별시 중구 세종대로 110', lat: 37.5663, lng: 126.9779 }]);
  });

  it('returns no results for an unexpected body', () => {
    expect(parseNaverGeocode({ error: 'bad' })).toEqual([]);
  });
});
