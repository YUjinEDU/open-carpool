import { forwardRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Spinner } from './Spinner';
import type { PressableProps } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and swaps the leading icon for a spinner. The label stays, so the width does not jump. */
  loading?: boolean;
  /** Accessible name for the spinner while loading, e.g. "저장 중". */
  loadingLabel?: string;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap select-none ' +
  'transition-[background-color,color,transform,opacity] duration-150 ease-out ' +
  'active:scale-[0.98] motion-reduce:active:scale-100 ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-busy:opacity-80';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  ghost: 'bg-transparent text-accent-ink hover:bg-accent-wash',
  danger: 'bg-danger-solid text-white hover:bg-danger-hover',
};

/** sm (36px) only inside rows that are themselves 44px targets; md is the default 44px control; lg is the page's main action. */
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sub [&_svg]:size-4',
  md: 'h-11 px-4 text-body [&_svg]:size-5',
  lg: 'h-13 px-5 text-body [&_svg]:size-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANT[variant], SIZE[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Spinner label={loadingLabel ?? ''} size={size === 'sm' ? 'sm' : 'md'} />
      ) : (
        leadingIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leadingIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {trailingIcon && !loading && <span className="inline-flex shrink-0" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
});
