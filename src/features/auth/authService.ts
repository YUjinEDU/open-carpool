import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { config } from '../../shared/config';
import type { Locale, UserProfile } from '../../domain/types';
import { getProfile, upsertProfile } from '../../data/users';
import { nowIso } from '../../data/converters';

/** All sign-in goes through Firebase Auth; this app never stores or hashes passwords. */

export const EMAIL_FOR_SIGN_IN_KEY = 'oc-email-for-signin';

export type AuthErrorCode = 'kakao-disabled';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** `redirecting`: the popup was unavailable and the browser is navigating to the provider. */
export type SignInResult = { readonly status: 'signed-in'; readonly user: User } | { readonly status: 'redirecting' };

export type EmailLinkResult =
  | { readonly status: 'signed-in'; readonly user: User }
  | { readonly status: 'needs-email' }
  | { readonly status: 'not-a-sign-in-link' };

const POPUP_UNAVAILABLE = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']);

async function signInWithProvider(provider: GoogleAuthProvider | OAuthProvider): Promise<SignInResult> {
  try {
    const { user } = await signInWithPopup(auth, provider);
    return { status: 'signed-in', user };
  } catch (error) {
    if (error instanceof FirebaseError && POPUP_UNAVAILABLE.has(error.code)) {
      await signInWithRedirect(auth, provider);
      return { status: 'redirecting' };
    }
    throw error;
  }
}

export function signInWithGoogle(): Promise<SignInResult> {
  return signInWithProvider(new GoogleAuthProvider());
}

/** Kakao via Firebase OIDC provider `oidc.kakao` (needs Identity Platform, see .env.example). */
export function signInWithKakao(): Promise<SignInResult> {
  if (!config.kakaoOidcEnabled) {
    return Promise.reject(new AuthError('kakao-disabled', 'Kakao sign-in is not enabled (VITE_KAKAO_OIDC_ENABLED)'));
  }
  return signInWithProvider(new OAuthProvider('oidc.kakao'));
}

export async function sendEmailSignInLink(email: string, continueUrl: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, { url: continueUrl, handleCodeInApp: true });
  localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
}

/**
 * Finish an email-link sign-in. When the link is opened on another device the stored email is
 * missing: the caller asks the user and calls again with `email`.
 */
export async function completeEmailLinkSignIn(url: string, email?: string): Promise<EmailLinkResult> {
  if (!isSignInWithEmailLink(auth, url)) return { status: 'not-a-sign-in-link' };
  const address = email ?? localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!address) return { status: 'needs-email' };
  const { user } = await signInWithEmailLink(auth, address, url);
  localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  return { status: 'signed-in', user };
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

const browserLocale = (): Locale =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';

/** Return the user's profile, creating `users/{uid}` on first sign-in. */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const existing = await getProfile(user.uid);
  if (existing) return existing;
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? '',
    email: user.email,
    photoURL: user.photoURL,
    locale: browserLocale(),
    createdAt: nowIso(),
  };
  await upsertProfile(profile);
  return profile;
}
