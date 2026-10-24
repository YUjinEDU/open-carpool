export type ClassValue = string | number | bigint | boolean | null | undefined;

/** Joins non-empty string class names; every other value (false, 0, null, a ReactNode guard) is dropped. */
export function cx(...values: ClassValue[]): string {
  let out = '';
  for (const value of values) {
    if (typeof value === 'string' && value) out = out ? out + ' ' + value : value;
  }
  return out;
}
