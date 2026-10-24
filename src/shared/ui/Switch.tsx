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
 * A settings-style row: text on the left, switch on the right. The whole row is the button, so the
 * 44px target spans the label as well as the 52x32 track.
 * On and off differ by thumb position and a check glyph, not only by colour.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, label, description, labelHidden, className, disabled, ...rest },
  ref,
) {
  const labelId = useId();
  const descId = useId();
  return (
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
        'flex min-h-11 w-full items-center justify-between gap-4 rounded-control text-left',
        'disabled:cursor-not-allowed disabled:opacity-45',
        labelHidden && 'w-auto justify-start',
        className,
      )}
      {...rest}
    >
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
      <span
        aria-hidden="true"
        className={cx(
          'relative inline-flex h-8 w-13 shrink-0 items-center rounded-chip border transition-colors duration-200 ease-out',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3',
        )}
      >
        <span
          className={cx(
            'ml-0.5 grid size-6.5 place-items-center rounded-chip bg-white text-accent shadow-[0_1px_2px_rgb(21_25_22/0.2)] transition-transform duration-200 ease-out-quint motion-reduce:transition-none',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        >
          <Check className={cx('size-3.5 transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
        </span>
      </span>
    </button>
  );
});
