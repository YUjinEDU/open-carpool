import { describe, expect, it } from 'vitest';
import { fromDraft, toDraft, weekdayName } from './schedule';

describe('schedule draft', () => {
  it('round-trips enabled days and drops disabled ones', () => {
    const draft = toDraft({ 1: { out: '08:00', back: '18:00' }, 3: { out: '09:00' } });
    const edited = { ...draft, 3: { ...draft[3], enabled: false }, 5: { enabled: true, out: '', back: '17:30' } };
    expect(fromDraft(edited)).toEqual({ 1: { out: '08:00', back: '18:00' }, 5: { back: '17:30' } });
  });

  it('names ISO weekdays starting on Monday', () => {
    expect(weekdayName(1, 'en')).toBe('Mon');
    expect(weekdayName(7, 'en')).toBe('Sun');
  });
});
