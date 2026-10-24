import { describe, expect, it } from 'vitest';
import { navButtonsFor } from './navButtons';

const destination = { label: 'Office', lat: 37.5, lng: 127 };

describe('navButtonsFor', () => {
  it('returns nothing without a destination', () => {
    expect(navButtonsFor({ country: 'KR', destination: null }, 'android')).toEqual([]);
  });

  it('opens the native app on mobile and the web map on desktop', () => {
    const [mobile] = navButtonsFor({ country: 'KR', destination }, 'android');
    const [desktop] = navButtonsFor({ country: 'KR', destination }, 'other');
    expect(mobile.href.startsWith('nmap://')).toBe(true);
    expect(desktop.href.startsWith('https://map.naver.com/')).toBe(true);
  });
});
