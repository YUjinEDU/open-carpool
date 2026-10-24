import { describe, expect, it } from 'vitest';
import { detectInAppBrowser, detectPlatform, externalOpenUrl } from './inapp';

const UA = {
  kakaoIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5',
  kakaoAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36;KAKAOTALK 2410450',
  lineIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/13.17.0',
  lineAndroid: 'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Line/13.17.0/IAB',
  instagram: 'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.29.110 Android',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.30.110]',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('detects KakaoTalk on iOS and Android', () => {
    expect(detectInAppBrowser(UA.kakaoIos)).toBe('kakaotalk');
    expect(detectInAppBrowser(UA.kakaoAndroid)).toBe('kakaotalk');
  });
  it('detects LINE on iOS and Android', () => {
    expect(detectInAppBrowser(UA.lineIos)).toBe('line');
    expect(detectInAppBrowser(UA.lineAndroid)).toBe('line');
  });
  it('detects Instagram and Facebook', () => {
    expect(detectInAppBrowser(UA.instagram)).toBe('instagram');
    expect(detectInAppBrowser(UA.facebook)).toBe('facebook');
  });
  it('returns null for regular browsers', () => {
    expect(detectInAppBrowser(UA.safari)).toBeNull();
    expect(detectInAppBrowser(UA.chrome)).toBeNull();
  });
});

describe('detectPlatform', () => {
  it('distinguishes iOS, Android and other', () => {
    expect(detectPlatform(UA.kakaoIos)).toBe('ios');
    expect(detectPlatform(UA.kakaoAndroid)).toBe('android');
    expect(detectPlatform(UA.chrome)).toBe('other');
  });
});

describe('externalOpenUrl', () => {
  const url = 'https://carpool.example/join?code=AB12&name=홍길동';
  it('uses the KakaoTalk openExternal scheme with the URL encoded', () => {
    const out = externalOpenUrl('kakaotalk', url, 'ios');
    expect(out).toBe(`kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`);
    expect(out).not.toMatch(/[?&]code=/);
  });
  it('adds openExternalBrowser=1 for LINE and keeps existing params', () => {
    const out = new URL(externalOpenUrl('line', url, 'android') ?? '');
    expect(out.searchParams.get('openExternalBrowser')).toBe('1');
    expect(out.searchParams.get('code')).toBe('AB12');
    expect(out.searchParams.get('name')).toBe('홍길동');
  });
  it('uses a Chrome intent for other in-app browsers on Android only', () => {
    expect(externalOpenUrl('instagram', 'https://carpool.example/a?b=1', 'android'))
      .toBe('intent://carpool.example/a?b=1#Intent;scheme=https;package=com.android.chrome;end');
    expect(externalOpenUrl('facebook', url, 'ios')).toBeNull();
  });
  it('returns null outside in-app browsers', () => {
    expect(externalOpenUrl(null, url, 'android')).toBeNull();
  });
});
