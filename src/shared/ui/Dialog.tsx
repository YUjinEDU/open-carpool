import { useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';
import { useModalDialog } from './modal';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** States the situation ("이 크루를 일시정지할까요?"), never the app name. */
  title: ReactNode;
  /** At most two short sentences. */
  description?: ReactNode;
  /** Body content for non-alert dialogs (a short form, a list). */
  children?: ReactNode;
  /**
   * Buttons, usually Cancel (secondary) then the outcome verb (primary or danger).
   * Rendered in a 2-column grid; a single action spans the row.
   */
  actions: ReactNode;
  /** alertdialog for confirmations that interrupt the user. */
  role?: 'dialog' | 'alertdialog';
  className?: string;
}

/** Centered modal. Initial focus lands on the panel, so Enter never triggers a button by accident. */
export function Dialog({ open, onClose, title, description, children, actions, role = 'dialog', className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { dialogProps } = useModalDialog(open, onClose, panelRef);
  return (
    <dialog
      {...dialogProps}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cx(
        'fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm overflow-visible border-0 bg-transparent p-0 text-ink',
        'open:animate-dialog-in data-closing:animate-dialog-out',
        'backdrop:bg-scrim backdrop:animate-fade-in',
      )}
    >
      <div ref={panelRef} tabIndex={-1} className={cx('rounded-card bg-surface p-5 shadow-float outline-none', className)}>
        <h2 id={titleId} className="text-title-2 text-ink">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-body text-ink-2">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 grid grid-flow-col auto-cols-fr gap-2 [&>*]:w-full">{actions}</div>
      </div>
    </dialog>
  );
}
