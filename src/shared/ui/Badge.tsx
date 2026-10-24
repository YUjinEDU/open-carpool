import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends RootProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Status glyph (Check for done, UserX for absent, AlertTriangle for needs driver). Pair colour with a glyph or clear wording. */
  icon?: ReactNode;
}

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  brand: 'bg-accent-wash-strong text-accent-ink',
  success: 'bg-success-wash text-success-ink',
  warn: 'bg-warn-wash text-warn-ink',
  danger: 'bg-danger-wash text-danger-ink',
  info: 'bg-info-wash text-info-ink',
};

const SIZE: Record<BadgeSize, string> = {
  sm: 'h-6 px-2 text-caption [&_svg]:size-3.5',
  md: 'h-7 px-2.5 text-sub [&_svg]:size-4',
};

/** Status pill. Trip status mapping: planned = neutral, needs_driver = warn, done = success, cancelled = neutral, absent member = neutral. */
export function Badge({ variant = 'neutral', size = 'sm', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-chip font-semibold whitespace-nowrap', VARIANT[variant], SIZE[size], className)} {...rest}>
      {icon && <span aria-hidden="true" className="inline-flex">{icon}</span>}
      {children}
    </span>
  );
}
