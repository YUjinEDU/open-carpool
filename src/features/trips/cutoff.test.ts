import { describe, expect, it } from 'vitest';
import { minutesUntilCutoff } from './cutoff';

const TZ = 'Asia/Seoul';
const kst = (date: string, time: string): Date => new Date(`${date}T${time}:00+09:00`);

describe('minutesUntilCutoff', () => {
  it('counts down to the cutoff hour on the day before the trip', () => {
    expect(minutesUntilCutoff('2026-10-27', 21, kst('2026-10-26', '18:46'), TZ)).toBe(134);
  });

  it('spans days when the trip is further out', () => {
    expect(minutesUntilCutoff('2026-10-29', 21, kst('2026-10-26', '21:00'), TZ)).toBe(2 * 1440);
  });

  it('is zero at the cutoff and negative afterwards', () => {
    expect(minutesUntilCutoff('2026-10-27', 21, kst('2026-10-26', '21:00'), TZ)).toBe(0);
    // 21:00 -> 07:30 next day is 10 h 30 min past the cutoff
    expect(minutesUntilCutoff('2026-10-27', 21, kst('2026-10-27', '07:30'), TZ)).toBe(-(10 * 60 + 30));
  });
});
