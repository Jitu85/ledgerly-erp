import { Building2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformAttribution } from "@/components/platform-attribution";
import { EmptyState } from "@erp/ui";

export default function PlatformPage() {
  return (
    <main className="platform-shell">
      <header className="platform-topbar">
        <Brand />
        <span className="platform-label">
          <ShieldCheck size={17} />
          Platform console
        </span>
        <ThemeToggle />
      </header>
      <section className="platform-content">
        <div className="page-heading">
          <div>
            <h1>Super Admin</h1>
            <p>Platform oversight is separated from ordinary company operations.</p>
          </div>
        </div>
        <div className="platform-note">
          <Building2 size={22} />
          <div>
            <strong>Company registry foundation</strong>
            <p>
              Company status, security, and support workflows will appear here without exposing
              unrestricted business records.
            </p>
          </div>
        </div>
        <EmptyState
          title="No platform activity to show"
          description="Operational platform controls are intentionally not part of this foundation screen."
        />
      </section>
      <PlatformAttribution />
    </main>
  );
}
