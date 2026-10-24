import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export interface EmptyStateProps extends Omit<RootProps, 'title'> {
  icon?: ReactNode;
  /** Says what is (not) here: "아직 크루가 없어요". */
  title: ReactNode;
  /** Says what to do next. */
  description?: ReactNode;
  /** The next action, usually one primary Button. */
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, compact = false, className, ...rest }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-10', className)} {...rest}>
      {icon && (
        <span aria-hidden="true" className={cx('grid place-items-center rounded-chip bg-surface-2 text-ink-3', compact ? 'size-10 [&_svg]:size-5' : 'size-14 [&_svg]:size-7')}>
          {icon}
        </span>
      )}
      <div className="max-w-[28ch]">
        <p className="text-title-3 text-ink">{title}</p>
        {description && <p className="mt-1 text-sub text-ink-2">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
