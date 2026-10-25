import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Group, UserProfile } from '../domain/types';
import { idConverter, nowIso } from './converters';
import { memberRef, newMember } from './members';

export interface InviteCode {
  readonly id: string; // the code itself (document id)
  readonly groupId: string;
  readonly groupName: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export type CreateGroupInput = Omit<Group, 'id' | 'ownerId' | 'inviteCode' | 'createdAt'>;
export type GroupPatch = Partial<
  Pick<Group, 'name' | 'type' | 'country' | 'locale' | 'allowedEmailDomains' | 'destination' | 'policy'>
>;
type Actor = Pick<UserProfile, 'uid' | 'displayName'>;

export class InviteNotFoundError extends Error {
  constructor(readonly code: string) {
    super(`invite code not found: ${code}`);
    this.name = 'InviteNotFoundError';
  }
}

/** The member picked as the new owner is not an active member of the group (any more). */
export class OwnershipTargetError extends Error {
  constructor(readonly uid: string) {
    super(`not an active member: ${uid}`);
    this.name = 'OwnershipTargetError';
  }
}

export class MembershipRemovedError extends Error {
  constructor(readonly groupId: string) {
    super(`membership in ${groupId} was removed by an admin`);
    this.name = 'MembershipRemovedError';
  }
}

/** No 0/O, 1/I/L: codes are read aloud and typed from screenshots. */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

export function generateInviteCode(): string {
  const n = INVITE_ALPHABET.length;
  const limit = 256 - (256 % n); // rejection sampling: no modulo bias
  let code = '';
  while (code.length < INVITE_CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < limit && code.length < INVITE_CODE_LENGTH) code += INVITE_ALPHABET[byte % n];
    }
  }
  return code;
}

export const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();

const groupRef = (gid: string) => doc(db, 'groups', gid).withConverter(idConverter<Group>());
const inviteRef = (code: string) => doc(db, 'inviteCodes', code).withConverter(idConverter<InviteCode>());

export async function createGroup(input: CreateGroupInput, owner: Actor): Promise<Group> {
  const ref = doc(collection(db, 'groups'));
  const group: Group = {
    ...input,
    id: ref.id,
    ownerId: owner.uid,
    inviteCode: generateInviteCode(),
    createdAt: nowIso(),
  };
  const batch = writeBatch(db);
  batch.set(groupRef(group.id), group);
  batch.set(
    memberRef(group.id, owner.uid),
    newMember({ uid: owner.uid, displayName: owner.displayName, role: 'owner', inviteCode: group.inviteCode }),
  );
  batch.set(inviteRef(group.inviteCode), {
    id: group.inviteCode,
    groupId: group.id,
    groupName: group.name,
    createdBy: owner.uid,
    createdAt: group.createdAt,
  });
  await batch.commit();
  return group;
}

export async function lookupInvite(code: string): Promise<InviteCode | null> {
  const snap = await getDoc(inviteRef(normalizeInviteCode(code)));
  return snap.exists() ? snap.data() : null;
}

/** Join (or re-join after leaving) the group behind an invite code. Returns the group id. */
export async function joinGroup(code: string, profile: Actor): Promise<string> {
  const invite = await lookupInvite(code);
  if (!invite) throw new InviteNotFoundError(code);
  const ref = memberRef(invite.groupId, profile.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(
      ref,
      newMember({ uid: profile.uid, displayName: profile.displayName, role: 'member', inviteCode: invite.id }),
    );
  } else if (existing.data().status === 'left') {
    await updateDoc(ref, { status: 'active', role: 'member', inviteCode: invite.id });
  } else if (existing.data().status === 'removed') {
    throw new MembershipRemovedError(invite.groupId);
  }
  return invite.groupId;
}

export async function getGroup(gid: string): Promise<Group | null> {
  const snap = await getDoc(groupRef(gid));
  return snap.exists() ? snap.data() : null;
}

export async function listMyGroups(uid: string): Promise<Group[]> {
  const memberships = await getDocs(
    query(collectionGroup(db, 'members'), where('uid', '==', uid), where('status', '==', 'active')),
  );
  const gids = memberships.docs.flatMap((d) => (d.ref.parent.parent ? [d.ref.parent.parent.id] : []));
  const groups = await Promise.all(gids.map(getGroup));
  return groups.filter((g): g is Group => g !== null);
}

export async function updateGroup(gid: string, patch: GroupPatch): Promise<void> {
  await updateDoc(groupRef(gid), { ...patch });
}

/** Owner action: `to` becomes owner and `from` (the current owner) becomes admin, atomically (rules check all three writes). */
export async function transferOwnership(gid: string, from: string, to: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const target = await tx.get(memberRef(gid, to));
    if (to === from || !target.exists() || target.data().status !== 'active') throw new OwnershipTargetError(to);
    tx.update(groupRef(gid), { ownerId: to });
    tx.update(memberRef(gid, to), { role: 'owner' });
    tx.update(memberRef(gid, from), { role: 'admin' });
  });
}

/** Stays under Firestore's 500 writes per batch. */
const DELETE_BATCH_SIZE = 400;

/**
 * Owner action: delete every crew (and its trips), event (and its cars), the other members and the invite
 * code in batches, then the owner's own membership together with the group doc. The owner's membership
 * goes last because the rules check it for every delete.
 */
export async function deleteGroup(group: Pick<Group, 'id' | 'inviteCode'>, ownerUid: string): Promise<void> {
  const gid = group.id;
  const list = (name: string) => getDocs(collection(db, 'groups', gid, name));
  const [crews, events, members] = await Promise.all([list('crews'), list('events'), list('members')]);
  const children = await Promise.all([
    ...crews.docs.map((d) => getDocs(collection(d.ref, 'trips'))),
    ...events.docs.map((d) => getDocs(collection(d.ref, 'cars'))),
  ]);
  const refs: DocumentReference[] = [
    ...children.flatMap((snap) => snap.docs.map((d) => d.ref)),
    ...crews.docs.map((d) => d.ref),
    ...events.docs.map((d) => d.ref),
    ...members.docs.filter((d) => d.id !== ownerUid).map((d) => d.ref),
    inviteRef(group.inviteCode),
  ];
  for (let i = 0; i < refs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + DELETE_BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }
  const last = writeBatch(db);
  last.delete(memberRef(gid, ownerUid));
  last.delete(groupRef(gid));
  await last.commit();
}

/** Admin action: issue a new code and retire the old one atomically. Returns the new code. */
export async function rotateInviteCode(gid: string, actorUid: string): Promise<string> {
  const group = await getGroup(gid);
  if (!group) throw new Error(`group not found: ${gid}`);
  const code = generateInviteCode();
  const batch = writeBatch(db);
  batch.set(inviteRef(code), {
    id: code,
    groupId: gid,
    groupName: group.name,
    createdBy: actorUid,
    createdAt: nowIso(),
  });
  batch.update(groupRef(gid), { inviteCode: code });
  batch.delete(inviteRef(group.inviteCode));
  await batch.commit();
  return code;
}
