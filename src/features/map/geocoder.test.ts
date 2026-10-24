import { describe, expect, it } from 'vitest';
import { coarseLabel, geocoderFor, geocoderKindFor, ManualGeocoder, NaverGeocoder, parseNaverGeocode, roundLatLng, toPlace } from './geocoder';

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

describe('coarseLabel (S-04)', () => {
  it.each([
    ['대전광역시 유성구 대학로 99', '대전광역시 유성구'],
    ['경기도 성남시 분당구 백현동 532', '경기도 성남시 분당구 백현동'],
    ['서울특별시 강남구 테헤란로 152 (역삼동, 강남파이낸스센터)', '서울특별시 강남구 역삼동'],
    ['경기도 성남시 분당구 판교역로 166 (백현동)', '경기도 성남시 분당구 백현동'],
    ['서울특별시 강남구 삼성로 95길 23 (삼성2동)', '서울특별시 강남구 삼성2동'],
    ['세종특별자치시 한누리대로 2130', '세종특별자치시'],
    ['1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA', 'Mountain View, USA'],
    ['판교역 1번 출구', '판교역'],
    ['분당구 정자동', '분당구 정자동'],
    ['  ', ''],
  ])('reduces %s to %s', (full, coarse) => {
    expect(coarseLabel(full)).toBe(coarse);
  });

  it('is idempotent, so labels stored as street addresses are shown coarse too', () => {
    for (const full of ['대전광역시 유성구 대학로 99', '서울특별시 강남구 테헤란로 152 (역삼동)', '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA']) {
      const once = coarseLabel(full);
      expect(coarseLabel(once)).toBe(once);
    }
  });

  it('never keeps a building number or a road name', () => {
    for (const full of ['대전광역시 유성구 대학로 99', '경기도 성남시 분당구 판교역로 166 (백현동, 카카오)', '부산광역시 해운대구 센텀중앙로 79']) {
      expect(coarseLabel(full)).not.toMatch(/\d|로$|길$/);
    }
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
