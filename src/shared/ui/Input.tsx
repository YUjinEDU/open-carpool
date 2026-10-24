import { forwardRef, type ReactNode } from 'react';
import { cx } from './cx';
import { CONTROL, FieldShell, describedBy, useFieldIds } from './Field';
import type { NativeInputProps } from './types';

export interface InputProps extends NativeInputProps {
  label: ReactNode;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
  /** Icon or short text inside the field on the left. */
  leading?: ReactNode;
  /** Icon, unit or small action inside the field on the right. */
  trailing?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, labelHidden, hint, error, optionalLabel, required, leading, trailing, className, wrapperClassName, ...rest },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <FieldShell ids={ids} label={label} labelHidden={labelHidden} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={wrapperClassName}>
      <div className="relative flex items-center">
        {leading && (
          <span className="pointer-events-none absolute left-3.5 inline-flex items-center text-ink-3 [&_svg]:size-5" aria-hidden="true">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={ids.id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          className={cx(CONTROL, 'h-12 px-4 read-only:bg-surface-2', leading && 'pl-11', trailing && 'pr-11', className)}
          {...rest}
        />
        {trailing && (
          <span className="absolute right-2 inline-flex items-center text-ink-3 [&_svg]:size-5">{trailing}</span>
        )}
      </div>
    </FieldShell>
  );
});
