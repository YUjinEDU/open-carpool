import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { useModalDialog } from './modal';
import type { RootProps } from './types';

export interface SheetPanelProps extends Omit<RootProps, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  /** Accessible name of the close control, e.g. "닫기". */
  closeLabel: string;
  onClose?: () => void;
  children: ReactNode;
  /** Sticky action row; put the primary Button here. */
  footer?: ReactNode;
  titleId?: string;
  descriptionId?: string;
  className?: string;
}

/**
 * The visible bottom-sheet panel: grabber, header, scrolling body, sticky footer.
 * Exported on its own so a gallery or a non-modal host can render it inline.
 */
export function SheetPanel({ title, description, closeLabel, onClose, children, footer, titleId, descriptionId, className }: SheetPanelProps) {
  return (
    <div className={cx('grid max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)_auto] bg-surface text-ink', className)}>
      <div className="px-4 pt-2">
        <div aria-hidden="true" className="mx-auto h-1 w-9 rounded-chip bg-line-strong" />
        <div className="flex items-start justify-between gap-3 pt-3">
          <div className="min-w-0 pt-1.5">
            {title && (
              <h2 id={titleId} className="text-title-2 text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-1 text-sub text-ink-2">
                {description}
              </p>
            )}
          </div>
          {onClose && <IconButton label={closeLabel} icon={<X />} onClick={onClose} className="-mr-2" />}
        </div>
      </div>
      <div className="scroll-body px-4 pb-4 pt-3">{children}</div>
      {footer && <div className="hairline-top px-4 pt-3 pb-safe-offset">{footer}</div>}
    </div>
  );
}

export interface SheetProps extends Omit<SheetPanelProps, 'onClose' | 'titleId' | 'descriptionId'> {
  open: boolean;
  onClose: () => void;
}

/** Modal bottom sheet on a native <dialog>: focus trap, Esc, top layer and scrim come from the platform. */
export function Sheet({ open, onClose, title, description, closeLabel, children, footer, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { dialogProps, requestClose } = useModalDialog(open, onClose, panelRef);
  return (
    <dialog
      {...dialogProps}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      className={cx(
        'fixed inset-0 m-0 mx-auto mt-auto w-full max-w-md overflow-visible border-0 bg-transparent p-0 text-ink',
        'open:animate-sheet-in data-closing:animate-sheet-out',
        'backdrop:bg-scrim backdrop:animate-fade-in',
      )}
    >
      <div ref={panelRef} tabIndex={-1} className="rounded-t-sheet shadow-sheet outline-none overflow-hidden">
        <SheetPanel title={title} description={description} closeLabel={closeLabel} onClose={requestClose} footer={footer} titleId={titleId} descriptionId={descriptionId} className={className}>
          {children}
        </SheetPanel>
      </div>
    </dialog>
  );
}
