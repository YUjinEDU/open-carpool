import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateDoc = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock('firebase/firestore', () => ({
  doc: () => ({ withConverter: () => ({ path: 'users/u1' }) }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
}));
vi.mock('../firebase', () => ({ db: {} }));

import { patchProfile } from './users';

describe('patchProfile', () => {
  beforeEach(() => updateDoc.mockClear());

  it('writes only the fields it is given, never a whole profile', async () => {
    // Given a locale change; When it is patched; Then exactly that field goes out
    await patchProfile('u1', { locale: 'en' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc.mock.calls[0]?.[1]).toEqual({ locale: 'en' });
  });
});
