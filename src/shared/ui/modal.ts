import { useCallback, useEffect, useRef, type MouseEvent, type RefObject, type SyntheticEvent } from 'react';

const EXIT_FALLBACK_MS = 260;

/**
 * Drives a native <dialog> from an `open` prop with an animated exit.
 * Entry uses the element's CSS animation; exit adds data-closing (CSS animates it) and calls close() when it ends.
 * Esc (cancel) and backdrop clicks route through requestClose so they animate too.
 */
export function useModalDialog(open: boolean, onClose: () => void, panelRef?: RefObject<HTMLElement | null>) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);

  const requestClose = useCallback(() => {
    const dialog = ref.current;
    if (!dialog || !dialog.open || closing.current) return;
    closing.current = true;
    dialog.dataset.closing = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeEventListener('animationend', finish);
      delete dialog.dataset.closing;
      closing.current = false;
      if (dialog.open) dialog.close();
    };
    dialog.addEventListener('animationend', finish);
    window.setTimeout(finish, EXIT_FALLBACK_MS);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus the panel itself so Enter does nothing until the user chooses a control.
      (panelRef?.current ?? dialog).focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      requestClose();
    }
  }, [open, panelRef, requestClose]);

  // Lock document scroll while a modal is up (the sheet body is the only scroll owner).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const dialogProps = {
    ref,
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      requestClose();
    },
    onClose: () => {
      closing.current = false;
      onClose();
    },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) requestClose();
    },
  };

  return { dialogProps, requestClose };
}
