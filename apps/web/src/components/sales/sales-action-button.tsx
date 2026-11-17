"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function SalesActionButton({
  label,
  effect,
  onConfirm,
  loading = false,
  disabled = false,
}: {
  label: string;
  effect: string;
  onConfirm?: () => Promise<void> | void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (onConfirm) {
      setSubmitting(true);
      try {
        await onConfirm();
        setOpen(false);
      } finally {
        setSubmitting(false);
      }
    } else {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary"
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {label}
      </button>
      {open ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sales-confirm-title"
            aria-describedby="sales-confirm-effect"
          >
            <span className="dialog-icon">
              <AlertTriangle size={22} />
            </span>
            <h2 id="sales-confirm-title">Confirm sales action</h2>
            <p id="sales-confirm-effect">{effect}</p>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                Go back
              </button>
              <button
                className="button button-primary"
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting ? "Processing..." : "Confirm action"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
