import { ArrowRight, Check, ShieldCheck, UserPlus } from "lucide-react";
import { EmptyState } from "@erp/ui";

const foundation = [
  { label: "Company profile", status: "Completed", tone: "success" },
  { label: "Email verification", status: "Pending verification", tone: "warning" },
  { label: "Security settings", status: "Review settings", tone: "warning" },
] as const;

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Good morning, Amina</h1>
          <p>Your company workspace is ready.</p>
        </div>
        <button className="button button-primary" type="button">
          <UserPlus size={18} />
          Invite a teammate
        </button>
      </div>
      <div className="dashboard-grid">
        <section className="foundation-panel">
          <h2>Complete your foundation</h2>
          <div className="foundation-list">
            {foundation.map((item) => (
              <button className="foundation-row" type="button" key={item.label}>
                <span className={`status-icon status-${item.tone}`}>
                  {item.tone === "success" ? <Check size={18} /> : <ShieldCheck size={18} />}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.status}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>
        <EmptyState
          title="No business activity yet"
          description="Operational modules will appear here in later phases."
        />
      </div>
    </>
  );
}
