import { useId, type ReactNode } from 'react';
import { cx } from './cx';

export interface FieldIds {
  id: string;
  hintId: string;
  errorId: string;
}

/** Stable ids for a labelled control; pass `id` to keep an external one. */
export function useFieldIds(id?: string): FieldIds {
  const auto = useId();
  const base = id ?? `field-${auto}`;
  return { id: base, hintId: `${base}-hint`, errorId: `${base}-error` };
}

/** aria-describedby value for the control: error first (it is the more urgent text), then hint. */
export function describedBy(ids: FieldIds, hint?: ReactNode, error?: ReactNode): string | undefined {
  const parts: string[] = [];
  if (error) parts.push(ids.errorId);
  if (hint) parts.push(ids.hintId);
  return parts.length ? parts.join(' ') : undefined;
}

export interface FieldShellProps {
  ids: FieldIds;
  label: ReactNode;
  /** Keeps the label for assistive tech but hides it visually (search fields with a visible icon, for example). */
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Text shown after the label for optional fields, e.g. "(선택)". */
  optionalLabel?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label above, control, then error or hint below. Shared by Input, TextArea, Select and TimeField. */
export function FieldShell({ ids, label, labelHidden, hint, error, required, optionalLabel, className, children }: FieldShellProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={ids.id} className={cx('text-sub font-medium text-ink-2', labelHidden && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-danger-ink">*</span>}
        {!required && optionalLabel && <span className="ml-1 font-normal text-ink-3">{optionalLabel}</span>}
      </label>
      {children}
      {error ? (
        <p id={ids.errorId} role="alert" className="text-caption font-medium text-danger-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={ids.hintId} className="text-caption text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Shared control chrome for text-like inputs. */
export const CONTROL =
  'w-full min-w-0 rounded-control border border-line-strong bg-surface text-body text-ink placeholder:text-ink-3 ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 ' +
  'aria-invalid:border-danger-ink aria-invalid:focus:ring-danger-ink/20 ' +
  'disabled:bg-surface-2 disabled:text-ink-3';
