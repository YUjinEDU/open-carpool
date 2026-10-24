import { collection, collectionGroup, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Member, MemberRole } from '../domain/types';
import { nowIso, plainConverter } from './converters';

export const memberRef = (gid: string, uid: string) =>
  doc(db, 'groups', gid, 'members', uid).withConverter(plainConverter<Member>());

const membersCol = (gid: string) => collection(db, 'groups', gid, 'members').withConverter(plainConverter<Member>());

export interface NewMemberInput {
  readonly uid: string;
  readonly displayName: string;
  readonly role: Extract<MemberRole, 'owner' | 'member'>;
  readonly inviteCode: string;
}

export function newMember({ uid, displayName, role, inviteCode }: NewMemberInput): Member {
  return {
    uid,
    displayName,
    role,
    status: 'active',
    canDrive: false,
    seats: 0,
    plateLastDigit: null,
    areaLabel: '',
    area: null,
    schedule: {},
    joinedAt: nowIso(),
    inviteCode,
  };
}

/** Fields a member may change on their own document (never role / uid / inviteCode / joinedAt). */
export type MyMemberPatch = Partial<
  Pick<Member, 'displayName' | 'canDrive' | 'seats' | 'plateLastDigit' | 'areaLabel' | 'area' | 'schedule'>
>;

export async function listMembers(gid: string): Promise<Member[]> {
  const snap = await getDocs(membersCol(gid));
  return snap.docs.map((d) => d.data());
}

export async function getMember(gid: string, uid: string): Promise<Member | null> {
  const snap = await getDoc(memberRef(gid, uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateMyMember(gid: string, uid: string, patch: MyMemberPatch): Promise<void> {
  await updateDoc(memberRef(gid, uid), { ...patch });
}

/** The account name is the one name: copy it into every active membership so the ledgers and lists agree. */
export async function setDisplayNameEverywhere(uid: string, displayName: string): Promise<void> {
  const memberships = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', uid), where('status', '==', 'active')));
  const stale = memberships.docs.filter((d) => d.data().displayName !== displayName);
  if (stale.length === 0) return;
  const batch = writeBatch(db);
  for (const d of stale) batch.update(d.ref, { displayName });
  await batch.commit();
}

/** Admin action. Ownership is never transferred through this call (rules deny role 'owner'). */
export async function setMemberRole(gid: string, uid: string, role: Exclude<MemberRole, 'owner'>): Promise<void> {
  await updateDoc(memberRef(gid, uid), { role });
}

/** Admin action: removed members cannot re-activate themselves (rules enforce it). */
export async function removeMember(gid: string, uid: string): Promise<void> {
  await updateDoc(memberRef(gid, uid), { status: 'removed' });
}

export async function leaveGroup(gid: string, uid: string): Promise<void> {
  await updateDoc(memberRef(gid, uid), { status: 'left' });
}
