import { Boxes, Database, ShieldCheck, Workflow } from "lucide-react";
import { PLATFORM_ATTRIBUTION } from "@/components/platform-attribution";

const systemItems = [
  { icon: Boxes, label: "Inventory engine", value: "Phase 3" },
  { icon: Database, label: "System of record", value: "PostgreSQL" },
  { icon: ShieldCheck, label: "Tenant protection", value: "Server authorization + RLS" },
  { icon: Workflow, label: "Stock integrity", value: "Immutable ledger" },
] as const;

export default function AboutPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">System information</p>
          <h1>About Ledgerly ERP</h1>
          <p>Platform identity, architecture, and attribution.</p>
        </div>
      </div>
      <section className="about-card">
        <div>
          <span className="status-chip status-chip-live">Operational foundation</span>
          <h2>Ledgerly ERP</h2>
          <p>
            A secure, multi-tenant business platform with exact inventory quantities and auditable
            posting.
          </p>
        </div>
        <dl className="system-grid">
          {systemItems.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <dt>
                <Icon size={18} />
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="about-attribution">
          <span>Official platform attribution</span>
          <strong>{PLATFORM_ATTRIBUTION}</strong>
        </div>
      </section>
    </>
  );
}
