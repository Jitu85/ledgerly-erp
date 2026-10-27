"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export function SensitiveActionButton({ label, effect }: { label: string; effect: string }) {
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
            aria-labelledby="confirm-title"
            aria-describedby="confirm-effect"
          >
            <span className="dialog-icon">
              <AlertTriangle size={22} />
            </span>
            <h2 id="confirm-title">Confirm inventory effect</h2>
            <p id="confirm-effect">{effect}</p>
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
                Confirm posting
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
