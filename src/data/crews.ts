import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MAX_CREW_SIZE, type Crew, type Scores } from '../domain/types';
import { idConverter, nowIso } from './converters';

export type CreateCrewInput = Pick<
  Crew,
  'name' | 'memberIds' | 'captainId' | 'backupDriverIds' | 'days' | 'outTime' | 'backTime' | 'pickupNote' | 'waitLimitMin'
>;
export type CrewPatch = Partial<
  Pick<Crew, 'name' | 'captainId' | 'backupDriverIds' | 'status' | 'days' | 'outTime' | 'backTime' | 'pickupNote' | 'waitLimitMin'>
>;

export class CrewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrewInputError';
  }
}

export const crewsCol = (gid: string) => collection(db, 'groups', gid, 'crews').withConverter(idConverter<Crew>());
export const crewRef = (gid: string, cid: string) =>
  doc(db, 'groups', gid, 'crews', cid).withConverter(idConverter<Crew>());

export async function createCrew(gid: string, input: CreateCrewInput, creatorUid: string): Promise<Crew> {
  const memberIds = [...new Set(input.memberIds)];
  if (!memberIds.includes(creatorUid)) throw new CrewInputError('creator must be a crew member');
  if (memberIds.length < 2 || memberIds.length > MAX_CREW_SIZE) {
    throw new CrewInputError(`crew size must be 2..${MAX_CREW_SIZE}, got ${memberIds.length}`);
  }
  const ref = doc(crewsCol(gid));
  const scores: Scores = Object.fromEntries(memberIds.map((uid) => [uid, 0]));
  const crew: Crew = {
    ...input,
    id: ref.id,
    memberIds,
    acceptedIds: [creatorUid],
    status: 'proposed',
    scores,
    lastDroveOn: {},
    createdBy: creatorUid,
    createdAt: nowIso(),
  };
  await setDoc(ref, crew);
  return crew;
}

/** Accept a proposed crew; it becomes active once every member accepted. */
export async function acceptCrew(gid: string, cid: string, uid: string): Promise<Crew> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(crewRef(gid, cid));
    if (!snap.exists()) throw new CrewInputError(`crew not found: ${cid}`);
    const crew = snap.data();
    if (!crew.memberIds.includes(uid)) throw new CrewInputError('only crew members can accept');
    const acceptedIds = [...new Set([...crew.acceptedIds, uid])];
    const everyoneAccepted = crew.memberIds.every((id) => acceptedIds.includes(id));
    const status = crew.status === 'proposed' && everyoneAccepted ? 'active' : crew.status;
    tx.update(crewRef(gid, cid), { acceptedIds, status });
    return { ...crew, acceptedIds, status };
  });
}

export async function updateCrew(gid: string, cid: string, patch: CrewPatch): Promise<void> {
  await updateDoc(crewRef(gid, cid), { ...patch });
}

export async function listCrews(gid: string): Promise<Crew[]> {
  const snap = await getDocs(crewsCol(gid));
  return snap.docs.map((d) => d.data());
}

export function subscribeCrews(
  gid: string,
  onChange: (crews: Crew[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(crewsCol(gid), (snap) => onChange(snap.docs.map((d) => d.data())), onError);
}
