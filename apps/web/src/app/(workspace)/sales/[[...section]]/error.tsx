"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="inventory-page">
      <div className="inventory-panel compact-empty">
        <strong>Sales workspace could not load</strong>
        <p>Try again without changing company context.</p>
        <button className="button button-primary" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
