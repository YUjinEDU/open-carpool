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

export type CreateGroupInput = Omit<Group, 'id' | 'ownerId' | 'inviteCode' | 'createdAt' | 'deleting'>;
/** What is left of a deleted group: never deleted, so the gid cannot be taken again (firestore.rules). */
export interface GroupTombstone {
  readonly id: string;
  readonly deleted: true;
  readonly deletedAt: string;
}
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
const groupDocRef = (gid: string) => doc(db, 'groups', gid).withConverter(idConverter<Group | GroupTombstone>());
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

/** The group doc as stored: a live group, the tombstone of a deleted one, or null when there is none. */
export async function readGroup(gid: string): Promise<Group | GroupTombstone | null> {
  const snap = await getDoc(groupDocRef(gid));
  return snap.exists() ? snap.data() : null;
}

export async function getGroup(gid: string): Promise<Group | null> {
  const group = await readGroup(gid);
  return group === null || 'deleted' in group ? null : group;
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
/** Listing passes before giving up; a pass after the freeze normally finds nothing new (W-02). */
const MAX_DELETE_PASSES = 4;

/** The group still has data after every pass: running the delete again resumes it. */
export class GroupDeleteIncompleteError extends Error {
  constructor(readonly groupId: string) {
    super(`group ${groupId} still has data after ${MAX_DELETE_PASSES} delete passes`);
    this.name = 'GroupDeleteIncompleteError';
  }
}

/** Every doc under the group except the owner's membership, children before their parents. */
async function listGroupData(gid: string, ownerUid: string): Promise<DocumentReference[]> {
  const list = (name: string) => getDocs(collection(db, 'groups', gid, name));
  const [crews, events, members] = await Promise.all([list('crews'), list('events'), list('members')]);
  const children = await Promise.all([
    ...crews.docs.map((d) => getDocs(collection(d.ref, 'trips'))),
    ...events.docs.map((d) => getDocs(collection(d.ref, 'cars'))),
  ]);
  return [
    ...children.flatMap((snap) => snap.docs.map((d) => d.ref)),
    ...crews.docs.map((d) => d.ref),
    ...events.docs.map((d) => d.ref),
    ...members.docs.filter((d) => d.id !== ownerUid).map((d) => d.ref),
  ];
}

/**
 * Owner action, in steps the rules allow only in this order: flag the group `deleting` (freezes every write
 * under it), delete every crew (and its trips), event (and its cars), the other members and the invite code
 * in batches, then the owner's own membership together with turning the group doc into a tombstone. The
 * owner's membership goes last because the rules check it for every delete. A run on a group that is
 * already deleting resumes, skipping what an earlier run deleted (the invite code is read from the stored
 * group, never the caller's copy, which a rotation may have outdated); a run on a tombstone does nothing.
 * The group is listed again before the tombstone, so a write whose rule check ran before the freeze but
 * which landed after a listing is still deleted (W-02); the tombstone goes only on a pass that finds nothing.
 */
export async function deleteGroup(group: Pick<Group, 'id'>, ownerUid: string): Promise<void> {
  const gid = group.id;
  const current = await readGroup(gid);
  if (current === null || 'deleted' in current) return;
  if (current.deleting !== true) await updateDoc(groupRef(gid), { deleting: true });
  const invite = await getDoc(inviteRef(current.inviteCode));
  const inviteRefs = invite.exists() && invite.data().groupId === gid ? [invite.ref] : [];
  for (let pass = 0; pass < MAX_DELETE_PASSES; pass += 1) {
    const refs = [...(await listGroupData(gid, ownerUid)), ...(pass === 0 ? inviteRefs : [])];
    if (refs.length === 0) {
      const last = writeBatch(db);
      last.delete(memberRef(gid, ownerUid));
      last.set(groupDocRef(gid), { id: gid, deleted: true, deletedAt: nowIso() });
      await last.commit();
      return;
    }
    for (let i = 0; i < refs.length; i += DELETE_BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(i, i + DELETE_BATCH_SIZE)) batch.delete(ref);
      await batch.commit();
    }
  }
  throw new GroupDeleteIncompleteError(gid);
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
