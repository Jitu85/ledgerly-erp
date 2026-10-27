import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className={`brand ${compact ? "brand-compact" : ""}`}
      href="/dashboard"
      aria-label="Ledgerly home"
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {compact ? null : <span>Ledgerly</span>}
    </Link>
  );
}
