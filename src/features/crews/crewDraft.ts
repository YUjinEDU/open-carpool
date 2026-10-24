import type { CreateCrewInput } from '../../data/crews';
import { MAX_CREW_SIZE, type Member, type Weekday } from '../../domain/types';

export interface CrewDraft {
  readonly name: string;
  readonly memberIds: readonly string[];
  readonly days: readonly Weekday[];
  readonly outTime: string; // 'HH:MM' or ''
  readonly backTime: string;
  readonly pickupNote: string;
  readonly waitLimitMin: number;
}

export type CrewFormError = 'name' | 'size' | 'driver' | 'days' | 'time' | 'waitLimit';

export type CrewDraftResult =
  | { readonly kind: 'valid'; readonly input: CreateCrewInput }
  | { readonly kind: 'invalid'; readonly errors: readonly CrewFormError[] };

export const emptyCrewDraft = (meUid: string, memberIds: readonly string[] = []): CrewDraft => ({
  name: '',
  memberIds: [...new Set([meUid, ...memberIds])],
  days: [1, 2, 3, 4, 5],
  outTime: '',
  backTime: '',
  pickupNote: '',
  waitLimitMin: 5,
});

/** Parse the new-crew form: 2-6 members including me, at least one driver, a day and a time. */
export function parseCrewDraft(draft: CrewDraft, members: readonly Member[], meUid: string): CrewDraftResult {
  const memberIds = [...new Set([meUid, ...draft.memberIds])];
  const drivers = members.filter((m) => m.canDrive && memberIds.includes(m.uid)).map((m) => m.uid);
  const errors: CrewFormError[] = [
    ...(draft.name.trim() === '' ? (['name'] as const) : []),
    ...(memberIds.length < 2 || memberIds.length > MAX_CREW_SIZE ? (['size'] as const) : []),
    ...(drivers.length === 0 ? (['driver'] as const) : []),
    ...(draft.days.length === 0 ? (['days'] as const) : []),
    ...(draft.outTime === '' && draft.backTime === '' ? (['time'] as const) : []),
    ...(!Number.isInteger(draft.waitLimitMin) || draft.waitLimitMin < 0 || draft.waitLimitMin > 60 ? (['waitLimit'] as const) : []),
  ];
  if (errors.length > 0) return { kind: 'invalid', errors };
  return {
    kind: 'valid',
    input: {
      name: draft.name.trim(),
      memberIds,
      captainId: meUid,
      backupDriverIds: drivers.filter((uid) => uid !== meUid),
      days: [...draft.days].sort(),
      outTime: draft.outTime || null,
      backTime: draft.backTime || null,
      pickupNote: draft.pickupNote.trim(),
      waitLimitMin: draft.waitLimitMin,
    },
  };
}
