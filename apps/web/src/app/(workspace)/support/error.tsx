"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function SupportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Support module error:", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "24px",
        borderRadius: "8px",
        border: "1px solid #ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        textAlign: "center",
      }}
    >
      <AlertTriangle size={36} style={{ color: "#ef4444", margin: "0 auto 12px" }} />
      <h2 style={{ margin: "0 0 8px 0" }}>Support Service Error</h2>
      <p style={{ margin: "0 0 16px 0", color: "var(--muted)" }}>
        {error.message || "An unexpected error occurred in the support messaging module."}
      </p>
      <button type="button" className="button button-primary" onClick={() => reset()}>
        <RefreshCw size={14} style={{ marginRight: "6px" }} />
        Retry
      </button>
    </div>
  );
}
