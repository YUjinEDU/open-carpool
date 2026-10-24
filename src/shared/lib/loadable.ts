import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type Loadable<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error };

export const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/** Run `load` whenever `deps` change; `reload` re-runs it. Stale results are dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList): readonly [Loadable<T>, () => void] {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ status: 'ready', data }),
      (e: unknown) => active && setState({ status: 'error', error: toError(e) }),
    );
    return () => {
      active = false;
    };
    // `load` is a fresh closure every render; `deps` name what it actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return [state, reload];
}

export type Subscribe<T> = (onData: (data: T) => void, onError: (error: Error) => void) => () => void;

const LOADING: Loadable<never> = { status: 'loading' };
const sameDeps = (a: DependencyList, b: DependencyList): boolean =>
  a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/**
 * Keep the latest value pushed by a realtime subscription (e.g. Firestore onSnapshot). A value is
 * tagged with the deps it was subscribed under, so after the deps change the hook reports 'loading'
 * until the new subscription delivers instead of handing out data for the old inputs.
 */
export function useSubscription<T>(subscribe: Subscribe<T>, deps: DependencyList): Loadable<T> {
  const [state, setState] = useState<{ readonly deps: DependencyList; readonly value: Loadable<T> } | null>(null);
  useEffect(
    () =>
      subscribe(
        (data) => setState({ deps, value: { status: 'ready', data } }),
        (error) => setState({ deps, value: { status: 'error', error } }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
  return state !== null && sameDeps(state.deps, deps) ? state.value : LOADING;
}
