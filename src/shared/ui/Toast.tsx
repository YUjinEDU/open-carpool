import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cx } from './cx';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Show a transient message above the bottom nav. Use it only for outcomes that are not visible in place. */
export function showToast(message: string, kind: ToastKind = 'info'): void {
  const item = { id: nextId++, message, kind };
  listeners.forEach((l) => l(item));
}

const ICON: Record<ToastKind, ReactNode> = {
  info: <Info aria-hidden="true" className="size-5 shrink-0 text-ink-inverse/80" />,
  success: <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-brand-300" />,
  error: <AlertCircle aria-hidden="true" className="size-5 shrink-0 text-danger-ink" />,
};

export interface ToastContainerProps {
  durationMs?: number;
  /** Lifts the stack above a BottomNav. Default true; pass false on screens without one. */
  aboveNav?: boolean;
}

export function ToastContainer({ durationMs = 3000, aboveNav = true }: ToastContainerProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), durationMs);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [durationMs]);
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
          role="status"
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-control bg-ink px-4 py-3 text-sub font-medium text-ink-inverse shadow-toast animate-toast-in"
        >
          {ICON[t.kind]}
          <span className="min-w-0 flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
