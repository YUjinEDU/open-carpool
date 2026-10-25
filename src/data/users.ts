import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '../domain/types';
import { plainConverter } from './converters';

const userRef = (uid: string) => doc(db, 'users', uid).withConverter(plainConverter<UserProfile>());

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? snap.data() : null;
}

/** Field patch: only the given fields are written, so a stale copy of the rest cannot overwrite newer values. */
export async function patchProfile(uid: string, fields: Partial<Pick<UserProfile, 'displayName' | 'locale'>>): Promise<void> {
  await updateDoc(userRef(uid), fields);
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  await setDoc(userRef(profile.uid), profile, { merge: true });
}
