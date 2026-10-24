import { forwardRef, useId, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from './cx';
import type { PressableProps } from './types';

export interface SwitchProps extends Omit<PressableProps, 'onClick' | 'type' | 'role' | 'value'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  /** Hides the text visually; the button keeps it as its accessible name. */
  labelHidden?: boolean;
  className?: string;
}

/**
 * A settings-style row: text on the left, switch on the right. The whole row is the 44px target.
 * On and off differ by thumb position and a check glyph, not only by colour.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, label, description, labelHidden, className, disabled, ...rest },
  ref,
) {
  const labelId = useId();
  const descId = useId();
  return (
    <div className={cx('flex min-h-11 items-center justify-between gap-4', labelHidden && 'justify-start', className)}>
      <span className={cx('min-w-0', labelHidden && 'sr-only')}>
        <span id={labelId} className="block text-body text-ink">
          {label}
        </span>
        {description && (
          <span id={descId} className="mt-0.5 block text-sub text-ink-2">
            {description}
          </span>
        )}
      </span>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cx(
          'relative inline-flex h-8 w-13 shrink-0 items-center rounded-chip border transition-colors duration-200 ease-out',
          'disabled:opacity-45',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3',
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cx(
            'ml-0.5 grid size-6.5 place-items-center rounded-chip bg-white text-accent shadow-[0_1px_2px_rgb(21_25_22/0.2)] transition-transform duration-200 ease-out-quint motion-reduce:transition-none',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        >
          <Check className={cx('size-3.5 transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
});
