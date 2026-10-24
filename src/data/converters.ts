import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';

/**
 * Firestore converters. Documents are written only by this data layer under security rules,
 * so reads are trusted to match the domain types (no re-validation inside the boundary).
 */

/** Model whose `id` is the document id and is not stored as a field. */
export function idConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model): DocumentData {
      const data: DocumentData = { ...model };
      delete data.id;
      return data;
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { ...snap.data(), id: snap.id } as T;
    },
  };
}

/** Model stored verbatim (its key, e.g. `uid`, is both the doc id and a field). */
export function plainConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model): DocumentData {
      return { ...model };
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return snap.data() as T;
    },
  };
}

export const nowIso = (): string => new Date().toISOString();
