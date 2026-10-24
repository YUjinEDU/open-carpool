import { forwardRef, type ReactNode } from 'react';
import { cx } from './cx';
import { CONTROL, FieldShell, describedBy, useFieldIds } from './Field';
import type { NativeTextAreaProps } from './types';

export interface TextAreaProps extends NativeTextAreaProps {
  label: ReactNode;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
  wrapperClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { id, label, labelHidden, hint, error, optionalLabel, required, className, wrapperClassName, rows = 3, ...rest },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <FieldShell ids={ids} label={label} labelHidden={labelHidden} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={ids.id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={cx(CONTROL, 'min-h-24 resize-y px-4 py-3 read-only:bg-surface-2', className)}
        {...rest}
      />
    </FieldShell>
  );
});
