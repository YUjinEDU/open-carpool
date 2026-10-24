import { useEffect } from 'react';
import { zonedDateHour } from '../domain/dates';

/**
 * Local evening reminder. The browser Notification API only fires while the app is open and visible;
 * background push would need a server (FCM + scheduler) and is not part of this build.
 */
export const DIGEST_HOUR = 18;
const OPT_IN_KEY = 'oc-notify-digest';
const LAST_SHOWN_KEY = 'oc-notify-digest-last';

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
};

export const digestOptIn = (): boolean => read(OPT_IN_KEY) === '1' && notificationState() === 'granted';

/** Call from a user gesture: asks for permission when needed and stores the opt-in. Returns the new opt-in state. */
export async function requestDigestOptIn(): Promise<boolean> {
  if (notificationState() === 'unsupported') return false;
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  const granted = permission === 'granted';
  write(OPT_IN_KEY, granted ? '1' : null);
  return granted;
}

export function clearDigestOptIn(): void {
  write(OPT_IN_KEY, null);
}

export interface Digest {
  readonly title: string;
  readonly body: string;
}

/**
 * Shows the digest once per day as a local notification when the app is visible at or after DIGEST_HOUR
 * (group time zone). Re-checks on visibility changes and once a minute so crossing 18:00 while open counts.
 */
export function useDigestNotification(digest: Digest | null, tz: string): void {
  useEffect(() => {
    if (!digest) return undefined;
    const check = () => {
      if (!digestOptIn() || document.visibilityState !== 'visible') return;
      const { date, hour } = zonedDateHour(new Date(), tz);
      if (hour < DIGEST_HOUR || read(LAST_SHOWN_KEY) === date) return;
      write(LAST_SHOWN_KEY, date);
      try {
        new Notification(digest.title, { body: digest.body, tag: `oc-digest-${date}` });
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    };
    check();
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(timer);
    };
  }, [digest, tz]);
}
