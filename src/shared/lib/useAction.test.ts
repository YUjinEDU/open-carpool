import { FirebaseError } from 'firebase/app';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CarFullError, SeatsBelowRidersError } from '../../data/events';
import { DriverTakenError, TripAlreadyAppliedError } from '../../data/trips';
import i18n from '../i18n';
import { describeError, useAction } from './useAction';

// Only the error classes of the data layer are used here; no Firestore or Auth instance is needed.
vi.mock('../../firebase', () => ({ db: {}, auth: {} }));

describe('describeError', () => {
  it.each([
    [new TripAlreadyAppliedError('t1'), 'trip.alreadyApplied'],
    [new DriverTakenError('t1'), 'trip.driverTaken'],
    [new CarFullError('d1'), 'events.carFull'],
    [new SeatsBelowRidersError('d1'), 'events.seatsBelowRiders'],
    [new FirebaseError('permission-denied', 'Missing or insufficient permissions.'), 'common.error.permission'],
    [new FirebaseError('unavailable', 'The service is currently unavailable.'), 'common.error.network'],
    [new FirebaseError('auth/popup-closed-by-user', 'The popup has been closed by the user'), 'common.error.popupClosed'],
  ])('maps %s to its translated message', (error, key) => {
    expect(i18n.exists(key)).toBe(true);
    expect(describeError(error)).toBe(i18n.t(key));
  });

  it('never shows raw SDK text for an unknown error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(describeError(new Error('INTERNAL ASSERTION FAILED'))).toBe(i18n.t('common.unexpected'));
    spy.mockRestore();
  });
});

describe('useAction', () => {
  it('ignores run() while the previous call is still in flight', async () => {
    let finish = () => undefined as void;
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useAction(action));

    act(() => {
      result.current.run();
      result.current.run();
    });

    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(result.current.busy).toBe(false);
  });

  it('keeps an inline failure in error until cleared', async () => {
    const action = vi.fn(() => Promise.reject(new DriverTakenError('t1')));
    const { result } = renderHook(() => useAction(action, { report: 'inline' }));

    await act(async () => result.current.run());
    expect(result.current.error).toBe(i18n.t('trip.driverTaken'));

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
