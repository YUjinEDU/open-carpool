import type { CrewPatch } from '../../data/crews';
import type { Crew } from '../../domain/types';
import { parseCrewDraft, type CrewDraft, type CrewFormError } from './crewDraft';

/** The fields the crew edit form writes; rules accept them from the captain or a group admin. */
export type CrewSettingsPatch = Required<Pick<CrewPatch, 'name' | 'days' | 'outTime' | 'backTime' | 'pickupNote' | 'waitLimitMin'>>;

export type CrewSettingsResult =
  | { readonly kind: 'valid'; readonly patch: CrewSettingsPatch }
  | { readonly kind: 'invalid'; readonly errors: readonly CrewFormError[] };

export const draftFromCrew = (crew: Crew): CrewDraft => ({
  name: crew.name,
  memberIds: crew.memberIds,
  days: crew.days,
  outTime: crew.outTime ?? '',
  backTime: crew.backTime ?? '',
  pickupNote: crew.pickupNote,
  waitLimitMin: crew.waitLimitMin,
});

/** Same field checks as a new crew; membership is not edited here, so size and driver checks do not apply. */
export function parseCrewSettings(draft: CrewDraft): CrewSettingsResult {
  const parsed = parseCrewDraft(draft, [], draft.memberIds[0] ?? '');
  const errors = parsed.kind === 'invalid' ? parsed.errors.filter((e) => e !== 'size' && e !== 'driver') : [];
  if (errors.length > 0) return { kind: 'invalid', errors };
  return {
    kind: 'valid',
    patch: {
      name: draft.name.trim(),
      days: [...draft.days].sort((a, b) => a - b),
      outTime: draft.outTime || null,
      backTime: draft.backTime || null,
      pickupNote: draft.pickupNote.trim(),
      waitLimitMin: draft.waitLimitMin,
    },
  };
}
