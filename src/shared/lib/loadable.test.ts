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
    expect(result.current).toEqual({ status: 'ready', data: 'old data' });

    rerender({ key: 'new-range' });

    expect(result.current).toEqual({ status: 'loading' });
    act(() => push[1]?.('new data'));
    expect(result.current).toEqual({ status: 'ready', data: 'new data' });
  });
});
