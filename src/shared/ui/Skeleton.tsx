import { cx } from './cx';
import type { RootProps } from './types';

export interface SkeletonProps extends RootProps {
  variant?: 'text' | 'block' | 'circle';
  /** Number of text lines (text variant). The last line is shorter. */
  lines?: number;
  className?: string;
}

/** Placeholder matching the final layout's shape. Pulses gently; static under reduced motion. */
export function Skeleton({ variant = 'block', lines = 1, className }: SkeletonProps) {
  if (variant === 'text') {
    return (
      <span aria-hidden="true" className={cx('flex flex-col gap-2', className)}>
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className={cx('block h-4 animate-skeleton rounded-[0.375rem] bg-surface-3', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx('block animate-skeleton bg-surface-3', variant === 'circle' ? 'rounded-chip' : 'rounded-control', className)}
    />
  );
}
