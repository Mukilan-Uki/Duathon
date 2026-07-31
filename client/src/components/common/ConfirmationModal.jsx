import { useEffect, useRef } from 'react';

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
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5"
      role="presentation"
    >
      <section
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <h2 className="text-xl font-semibold" id="confirmation-title">
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
