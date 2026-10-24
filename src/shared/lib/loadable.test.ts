import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSubscription } from './loadable';

describe('useSubscription', () => {
  it('reports loading after its inputs change until the new subscription delivers', () => {
    const push: Array<(data: string) => void> = [];
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useSubscription<string>((onData) => {
          push.push(onData);
          return () => undefined;
        }, [key]),
      { initialProps: { key: 'old-range' } },
    );
    act(() => push[0]?.('old data'));
    expect(result.current).toMatchObject({ status: 'ready', data: 'old data' });

    rerender({ key: 'new-range' });

    expect(result.current.status).toBe('loading');
    act(() => push[1]?.('new data'));
    expect(result.current).toMatchObject({ status: 'ready', data: 'new data' });
  });

  it('subscribes again on retry after the listener failed', () => {
    const fail: Array<(error: Error) => void> = [];
    const { result } = renderHook(() =>
      useSubscription<string>((_onData, onError) => {
        fail.push(onError);
        return () => undefined;
      }, ['crews']),
    );
    act(() => fail[0]?.(new Error('unavailable')));
    expect(result.current.status).toBe('error');

    act(() => result.current.retry());

    expect(fail).toHaveLength(2);
    expect(result.current.status).toBe('loading');
  });
});
