import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastAction {
  /** Short outcome verb, e.g. "되돌리기". */
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Auto-dismiss delay. Defaults to 3 s; error toasts stay until dismissed unless a delay is given. */
  durationMs?: number;
  /** One action inside the toast (undo); the toast closes when it is pressed. */
  action?: ToastAction;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  durationMs: number | null;
  action?: ToastAction;
}

type Listener = (event: { type: 'show'; item: ToastItem } | { type: 'dismiss'; id: number }) => void;
const listeners = new Set<Listener>();
let nextId = 1;
const DEFAULT_MS = 3000;

/**
 * Show a message above the bottom nav. Use it only for outcomes that are not visible in place.
 * Errors are announced as alerts and stay until dismissed. Returns the toast id for dismissToast.
 */
export function showToast(message: string, kind: ToastKind = 'info', options: ToastOptions = {}): number {
  const durationMs = options.durationMs ?? (kind === 'error' ? null : DEFAULT_MS);
  const item: ToastItem = { id: nextId++, message, kind, durationMs, action: options.action };
  listeners.forEach((l) => l({ type: 'show', item }));
  return item.id;
}

export function dismissToast(id: number): void {
  listeners.forEach((l) => l({ type: 'dismiss', id }));
}

const ICON: Record<ToastKind, ReactNode> = {
  info: <Info aria-hidden="true" className="size-5 shrink-0 text-ink-inverse/80" />,
  success: <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-on-ink-success" />,
  error: <AlertCircle aria-hidden="true" className="size-5 shrink-0 text-on-ink-danger" />,
};

export interface ToastContainerProps {
  /** Accessible name of the dismiss control on sticky toasts, e.g. "닫기". */
  dismissLabel: string;
  /** Lifts the stack above a BottomNav. Default true; pass false on screens without one. */
  aboveNav?: boolean;
}

export function ToastContainer({ dismissLabel, aboveNav = true }: ToastContainerProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const timers = new Map<number, number>();
    const remove = (id: number) => {
      window.clearTimeout(timers.get(id));
      timers.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    };
    const listener: Listener = (event) => {
      if (event.type === 'dismiss') {
        remove(event.id);
        return;
      }
      const { item } = event;
      setItems((prev) => [...prev, item]);
      if (item.durationMs !== null) timers.set(item.id, window.setTimeout(() => remove(item.id), item.durationMs));
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
  return (
    <div
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4',
        aboveNav ? 'bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)]' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]',
      )}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-control bg-ink py-2 pl-4 pr-2 text-sub font-medium text-ink-inverse shadow-toast animate-toast-in"
        >
          {ICON[t.kind]}
          <span className="min-w-0 flex-1 py-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                dismissToast(t.id);
                t.action?.onClick();
              }}
              className="h-9 shrink-0 rounded-control px-3 text-sub font-semibold text-on-ink-success hover:bg-ink-inverse/10"
            >
              {t.action.label}
            </button>
          )}
          {t.durationMs === null && (
            <IconButton label={dismissLabel} icon={<X />} onClick={() => dismissToast(t.id)} className="-my-1 shrink-0 text-ink-inverse hover:bg-ink-inverse/10 hover:text-ink-inverse" />
          )}
        </div>
      ))}
    </div>
  );
}
