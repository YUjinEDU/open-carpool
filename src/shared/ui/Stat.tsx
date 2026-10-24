import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export interface StatProps extends Omit<RootProps, 'title'> {
  /** Formatted value ("12회", "87%"). Tabular digits keep columns aligned. */
  value: ReactNode;
  label: ReactNode;
  /** Comparison or caveat ("지난달 10회", "추정값"). */
  hint?: ReactNode;
  size?: 'md' | 'lg';
  align?: 'start' | 'center';
  className?: string;
}

export function Stat({ value, label, hint, size = 'md', align = 'start', className, ...rest }: StatProps) {
  return (
    <div className={cx('flex min-w-0 flex-col', align === 'center' && 'items-center text-center', className)} {...rest}>
      <span className={cx('tabular-nums text-ink', size === 'lg' ? 'text-numeral' : 'text-title-1')}>{value}</span>
      <span className="mt-1 text-sub text-ink-2">{label}</span>
      {hint && <span className="mt-0.5 text-caption text-ink-3">{hint}</span>}
    </div>
  );
}
