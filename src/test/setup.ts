import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Node >= 25 defines a global `localStorage` getter that returns undefined unless
// --localstorage-file is given, and it shadows jsdom's Storage in the test environment.
// Install an in-memory Storage so browser code under test sees a working implementation.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  const current = Object.getOwnPropertyDescriptor(globalThis, key);
  const works = (() => { try { return typeof globalThis[key]?.getItem === 'function'; } catch { return false; } })();
  if (!works || current?.get) vi.stubGlobal(key, new MemoryStorage());
}
