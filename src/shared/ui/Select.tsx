import { forwardRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';
import { CONTROL, FieldShell, describedBy, useFieldIds } from './Field';
import type { NativeSelectProps } from './types';

export interface SelectProps extends NativeSelectProps {
  label: ReactNode;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
  wrapperClassName?: string;
  /** <option> elements. Native select: phones get the system picker, which is the one-hand friendly choice. */
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, labelHidden, hint, error, optionalLabel, required, className, wrapperClassName, children, ...rest },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <FieldShell ids={ids} label={label} labelHidden={labelHidden} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={ids.id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          className={cx(CONTROL, 'h-12 appearance-none pl-4 pr-11', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
      </div>
    </FieldShell>
  );
});
