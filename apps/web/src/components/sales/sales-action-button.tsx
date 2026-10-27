"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
export function SalesActionButton({ label, effect }: { label: string; effect: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button button-primary" type="button" onClick={() => setOpen(true)}>
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
                onClick={() => setOpen(false)}
              >
                Go back
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Confirm action
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
