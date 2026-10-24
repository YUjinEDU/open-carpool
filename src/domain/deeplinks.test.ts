import { describe, expect, it } from 'vitest';
import { googleLink, kakaoLink, navLinksFor, naverLink } from './deeplinks';

const dest = { lat: 36.3504, lng: 127.3845, label: '회사 정문 & 주차장' };
const ENCODED = '%ED%9A%8C%EC%82%AC%20%EC%A0%95%EB%AC%B8%20%26%20%EC%A3%BC%EC%B0%A8%EC%9E%A5';

describe('provider links', () => {
  it('builds the Naver app route with an encoded Korean label', () => {
    const { appUrl, webUrl } = naverLink(dest);
    expect(appUrl).toBe(`nmap://route/car?dlat=36.3504&dlng=127.3845&dname=${ENCODED}&appname=org.opencarpool`);
    expect(new URL(webUrl).searchParams.get('etext')).toBe(dest.label);
  });
  it('builds the Kakao app route and web fallback', () => {
    const { appUrl, webUrl } = kakaoLink(dest);
    expect(appUrl).toBe('kakaomap://route?ep=36.3504,127.3845&by=CAR');
    expect(webUrl).toBe(`https://map.kakao.com/link/to/${ENCODED},36.3504,127.3845`);
  });
  it('encodes commas in labels so Kakao link/to parsing is not broken', () => {
    expect(kakaoLink({ ...dest, label: 'A,B' }).webUrl).toBe('https://map.kakao.com/link/to/A%2CB,36.3504,127.3845');
  });
  it('builds the Google directions URL', () => {
    expect(googleLink(dest).webUrl).toBe('https://www.google.com/maps/dir/?api=1&destination=36.3504,127.3845&travelmode=driving');
  });
});

describe('navLinksFor', () => {
  it('orders Naver, Kakao, Google for KR and Google first elsewhere', () => {
    expect(navLinksFor('KR', dest).map((l) => l.provider)).toEqual(['naver', 'kakao', 'google']);
    expect(navLinksFor('US', dest).map((l) => l.provider)).toEqual(['google', 'naver', 'kakao']);
  });
});
