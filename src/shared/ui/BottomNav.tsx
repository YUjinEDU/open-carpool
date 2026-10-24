import type { MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  /** Unread or pending count. Numbers only: a plain dot would be decoration. */
  badge?: number;
}

export interface BottomNavProps {
  items: ReadonlyArray<BottomNavItem>;
  activeKey: string;
  /** Called on tap. With a router, call event.preventDefault() and navigate(item.href). */
  onSelect?: (item: BottomNavItem, event: MouseEvent<HTMLElement>) => void;
  /** Accessible name of the nav landmark, e.g. "주요 메뉴". */
  label: string;
  /** fixed = real app shell; absolute = inside a framed preview. */
  position?: 'fixed' | 'absolute';
  className?: string;
}

/**
 * Tab bar: 56px plus the home-indicator safe area, icon above a one-word label, every tab always visible.
 * Active = accent ink plus a wash pill behind the glyph; never a border.
 */
export function BottomNav({ items, activeKey, onSelect, label, position = 'fixed', className }: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className={cx(
        position === 'fixed' ? 'fixed' : 'absolute',
        'inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md bg-surface/92 backdrop-blur-md hairline-top pb-safe',
        className,
      )}
    >
      <ul role="list" className="grid h-(--nav-height)" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          const Icon = item.icon;
          const inner = (
            <>
              <span className={cx('relative grid h-7 w-12 place-items-center rounded-chip transition-colors duration-150', active && 'bg-accent-wash')}>
                <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-chip bg-danger-solid px-1 text-[0.625rem] font-bold leading-none text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="text-label">{item.label}</span>
            </>
          );
          const cls = cx(
            'flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors duration-150',
            active ? 'text-accent-ink' : 'text-ink-3 hover:text-ink-2',
          );
          return (
            <li key={item.key} className="min-w-0">
              {item.href ? (
                <a href={item.href} aria-current={active ? 'page' : undefined} onClick={(e) => onSelect?.(item, e)} className={cls}>
                  {inner}
                </a>
              ) : (
                <button type="button" aria-current={active ? 'page' : undefined} onClick={(e) => onSelect?.(item, e)} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
