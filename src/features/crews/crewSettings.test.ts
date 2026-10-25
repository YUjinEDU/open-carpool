import { describe, expect, it } from 'vitest';
import type { Crew } from '../../domain/types';
import { draftFromCrew, parseCrewSettings } from './crewSettings';

const crew: Crew = {
  id: 'c1', name: 'Morning', memberIds: ['a', 'b'], captainId: 'a', backupDriverIds: [], acceptedIds: ['a', 'b'],
  status: 'active', days: [1, 3], outTime: '08:00', backTime: null, pickupNote: 'Gate 2', waitLimitMin: 10,
  scores: {}, lastDroveOn: {}, createdBy: 'a', createdAt: '2026-01-01T00:00:00Z',
};

describe('parseCrewSettings', () => {
  it('turns an edited crew into a patch of settings fields only', () => {
    const draft = { ...draftFromCrew(crew), name: ' Early ', days: [5, 1] as const, backTime: '18:30', outTime: '' };

    const result = parseCrewSettings(draft);

    expect(result).toEqual({
      kind: 'valid',
      patch: { name: 'Early', days: [1, 5], outTime: null, backTime: '18:30', pickupNote: 'Gate 2', waitLimitMin: 10 },
    });
  });

  it('reports field errors but never membership ones, even for a crew without a driver today', () => {
    const draft = { ...draftFromCrew(crew), name: '', days: [], outTime: '', backTime: '', waitLimitMin: 90 };

    const result = parseCrewSettings(draft);

    expect(result.kind === 'invalid' && [...result.errors].sort()).toEqual(['days', 'name', 'time', 'waitLimit']);
  });
});
