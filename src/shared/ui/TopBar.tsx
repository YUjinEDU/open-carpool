import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';

export interface TopBarProps {
  /** Names the screen (group name on Home, the screen name elsewhere). Keep it short; it truncates. */
  title: ReactNode;
  onBack?: () => void;
  /** Accessible name of the back control, e.g. "뒤로". Required when onBack is set. */
  backLabel?: string;
  /** Turns the title into a group switcher button (chevron, opens a Sheet). */
  onTitleClick?: () => void;
  /** Accessible hint for the switcher, e.g. "그룹 바꾸기". */
  titleActionLabel?: string;
  /** Slot before the title when there is no back button (brand mark, avatar). */
  leading?: ReactNode;
  /** Up to two IconButtons. */
  trailing?: ReactNode;
  sticky?: boolean;
  /** Transparent over the canvas until content scrolls under it (callers toggle via className). */
  transparent?: boolean;
  /** Admin and desktop layouts: the bar content spans max-w-5xl instead of the phone column. */
  wide?: boolean;
  className?: string;
}

export function TopBar({ title, onBack, backLabel = '', onTitleClick, titleActionLabel, leading, trailing, sticky = true, transparent = false, wide = false, className }: TopBarProps) {
  const titleNode = onTitleClick ? (
    <button
      type="button"
      onClick={onTitleClick}
      aria-haspopup="dialog"
      aria-label={titleActionLabel}
      className="inline-flex h-11 max-w-full items-center gap-1 rounded-control px-2 text-title-3 text-ink hover:bg-surface-2 active:bg-surface-3"
    >
      <span className="truncate">{title}</span>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
    </button>
  ) : (
    <h1 className="truncate px-2 text-title-3 text-ink">{title}</h1>
  );
  return (
    <header
      className={cx(
        sticky && 'sticky top-0 z-20',
        'pt-safe',
        transparent ? 'bg-transparent' : 'bg-surface/92 backdrop-blur-md hairline-bottom',
        className,
      )}
    >
      <div className={cx('mx-auto grid h-(--topbar-height) w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-1.5', wide ? 'max-w-5xl' : 'max-w-md')}>
        <div className="flex items-center">
          {onBack ? <IconButton label={backLabel} icon={<ChevronLeft />} onClick={onBack} /> : leading ? <div className="px-1.5">{leading}</div> : <span className="w-1.5" />}
        </div>
        <div className="flex min-w-0 items-center">{titleNode}</div>
        <div className="flex items-center justify-end gap-0.5">{trailing}</div>
      </div>
    </header>
  );
}
