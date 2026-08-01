import { useEffect, useId, useRef } from 'react';

export default function ConfirmationModal({
  open,
  title,
  children,
  busy,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  const titleId = useId();
  onCancelRef.current = onCancel;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCancelRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 className="text-xl font-semibold" id={titleId}>
          {title}
        </h2>
        <div className="mt-4 text-sm leading-6 text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-bank-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
