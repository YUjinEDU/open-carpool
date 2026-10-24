import { forwardRef, type MouseEvent, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from './cx';
import type { RootProps } from './types';

export interface ListProps extends RootProps {
  /** Wraps the rows in a card surface with a hairline. Off = bare rows separated by hairlines. */
  inset?: boolean;
  children?: ReactNode;
}

/** Rows are ListItem. One hairline between rows, none above the first or below the last. */
export function List({ inset = true, className, children, ...rest }: ListProps) {
  return (
    <ul
      role="list"
      className={cx('divide-y divide-line', inset && 'overflow-hidden rounded-card border border-line bg-surface', className)}
      {...rest}
    >
      {children}
    </ul>
  );
}

export interface ListItemProps extends Omit<RootProps, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Avatar or icon. */
  leading?: ReactNode;
  /** Value text, Badge, Switch or chevron. */
  trailing?: ReactNode;
  /** Renders a chevron after trailing; implied for rows with href. */
  chevron?: boolean;
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  /** Selected rows get an accent wash; pair it with a check glyph in trailing. */
  selected?: boolean;
  className?: string;
  /** aria-current for navigation rows, e.g. "page". */
  current?: 'page' | 'step' | 'true';
}

const ROW =
  'flex w-full min-h-14 items-center gap-3 px-4 py-2.5 text-left text-ink';

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { title, description, leading, trailing, chevron, href, onClick, disabled, selected, className, current },
  ref,
) {
  const interactive = Boolean(href || onClick) && !disabled;
  const content = (
    <>
      {leading && <span className="flex shrink-0 items-center text-ink-2">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{title}</span>
        {description && <span className="mt-0.5 block text-sub text-ink-2">{description}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2 text-sub text-ink-3">{trailing}</span>}
      {(chevron || href) && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-3" />}
    </>
  );
  const rowClass = cx(
    ROW,
    interactive && 'transition-colors duration-150 hover:bg-surface-2 active:bg-surface-3',
    selected && 'bg-accent-wash',
    disabled && 'opacity-45',
    className,
  );
  return (
    <li ref={ref} className="list-none">
      {href && !disabled ? (
        <a href={href} onClick={onClick} aria-current={current} className={rowClass}>
          {content}
        </a>
      ) : onClick && !disabled ? (
        <button type="button" onClick={onClick} aria-current={current} aria-pressed={selected} className={rowClass}>
          {content}
        </button>
      ) : (
        <div className={rowClass} aria-disabled={disabled || undefined}>
          {content}
        </div>
      )}
    </li>
  );
});
