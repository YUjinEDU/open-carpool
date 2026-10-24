import { forwardRef, type ReactNode } from 'react';
import { cx } from './cx';
import type { PressableProps } from './types';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary';
export type IconButtonSize = 'md' | 'lg';

export interface IconButtonProps extends PressableProps {
  /** Accessible name. Icon-only controls are unusable without it, so it is required. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
};

const SIZE: Record<IconButtonSize, string> = {
  md: 'size-11 [&_svg]:size-5',
  lg: 'size-13 [&_svg]:size-6',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-control transition-[background-color,color,transform] duration-150 ease-out',
        'active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">{icon}</span>
    </button>
  );
});
