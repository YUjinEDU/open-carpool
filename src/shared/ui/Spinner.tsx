import { cx } from './cx';
import type { RootProps } from './types';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends Omit<RootProps, 'title'> {
  /** Accessible name, e.g. "불러오는 중". Required: a spinner with no name is silent for screen readers. */
  label: string;
  size?: SpinnerSize;
  className?: string;
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
};

/** Indeterminate progress. Show it only for waits longer than about one second; prefer Skeleton for first paint. */
export function Spinner({ label, size = 'md', className }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cx('inline-flex shrink-0', className)}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx('animate-spin-slow text-current', SIZE[size])}>
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
