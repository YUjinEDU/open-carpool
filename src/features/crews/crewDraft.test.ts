import { describe, expect, it } from 'vitest';
import type { Member } from '../../domain/types';
import { emptyCrewDraft, parseCrewDraft, type CrewDraft } from './crewDraft';

const member = (uid: string, canDrive: boolean): Member => ({
  uid,
  displayName: uid,
  role: 'member',
  status: 'active',
  canDrive,
  seats: canDrive ? 3 : 0,
  plateLastDigit: null,
  areaLabel: '',
  area: null,
  schedule: {},
  joinedAt: '2026-10-01T00:00:00Z',
  inviteCode: 'x',
});
const members = [member('me', false), member('b', true), member('c', false), ...['d', 'e', 'f', 'g'].map((u) => member(u, false))];
const draft = (patch: Partial<CrewDraft>): CrewDraft => ({ ...emptyCrewDraft('me'), name: 'Morning', outTime: '08:00', ...patch });

describe('parseCrewDraft', () => {
  it('rejects a crew of just me', () => {
    const result = parseCrewDraft(draft({ memberIds: ['me'] }), members, 'me');
    expect(result.kind === 'invalid' ? result.errors : []).toContain('size');
  });

  it('rejects more than six members', () => {
    const result = parseCrewDraft(draft({ memberIds: ['b', 'c', 'd', 'e', 'f', 'g'] }), members, 'me');
    expect(result.kind === 'invalid' ? result.errors : []).toContain('size');
  });

  it('rejects a crew without anyone who can drive', () => {
    const result = parseCrewDraft(draft({ memberIds: ['c'] }), members, 'me');
    expect(result.kind === 'invalid' ? result.errors : []).toEqual(['driver']);
  });

  it('always includes me and makes me captain with the other drivers as backups', () => {
    const result = parseCrewDraft(draft({ memberIds: ['b', 'c'] }), members, 'me');
    expect(result.kind === 'valid' && result.input).toMatchObject({ memberIds: ['me', 'b', 'c'], captainId: 'me', backupDriverIds: ['b'], outTime: '08:00', backTime: null });
  });
});
