import { useEffect, useState } from 'react';

export type ToastKind = 'info' | 'success' | 'error';
interface ToastItem { id: number; message: string; kind: ToastKind }

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Show a transient message at the bottom of the screen. */
export function showToast(message: string, kind: ToastKind = 'info'): void {
  const item = { id: nextId++, message, kind };
  listeners.forEach((l) => l(item));
}

const KIND_CLASS: Record<ToastKind, string> = {
  info: 'bg-slate-800 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
};

export function ToastContainer({ durationMs = 3000 }: { durationMs?: number }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), durationMs);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [durationMs]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role="status" className={`pointer-events-auto max-w-md rounded-lg px-4 py-2 text-sm shadow-lg ${KIND_CLASS[t.kind]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
