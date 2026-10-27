import Link from "next/link";

export const PLATFORM_ATTRIBUTION = "Designed and Developed by ABHIJIT KUMAR MISRA";

export function PlatformAttribution({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`platform-attribution ${compact ? "platform-attribution-compact" : ""}`}>
      <span>{PLATFORM_ATTRIBUTION}</span>
      <Link href="/about">About / System Information</Link>
    </footer>
  );
}
