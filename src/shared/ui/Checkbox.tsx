import { forwardRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from './cx';
import type { NativeCheckboxProps } from './types';

export interface CheckboxProps extends NativeCheckboxProps {
  label: ReactNode;
  description?: ReactNode;
  /** Puts the box on the right, roster style. */
  boxPosition?: 'start' | 'end';
  wrapperClassName?: string;
}

/** Native checkbox under a drawn box: keyboard, forms and screen readers see a real input. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, boxPosition = 'start', wrapperClassName, className, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cx(
        'flex min-h-11 cursor-pointer items-center gap-3 py-1.5 text-ink',
        boxPosition === 'end' && 'flex-row-reverse justify-between',
        disabled && 'cursor-not-allowed opacity-45',
        wrapperClassName,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className={cx('peer sr-only', className)} {...rest} />
      <span
        aria-hidden="true"
        className={cx(
          'grid size-6 shrink-0 place-items-center rounded-[0.375rem] border-2 border-line-strong bg-surface text-on-accent transition-colors duration-150',
          'peer-checked:border-transparent peer-checked:bg-accent',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
        )}
      >
        <Check className="size-4" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body">{label}</span>
        {description && <span className="mt-0.5 block text-sub text-ink-2">{description}</span>}
      </span>
    </label>
  );
});
