"use client";

import { Building2, LogOut, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api";

type MeResponse = {
  user: { id: string; email: string; fullName: string; platformRole: string } | null;
  company: { id: string; name: string; slug: string; baseCurrency: string } | null;
  role: { membershipId: string; roleId: string; roleName: string } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJson<MeResponse>("/auth/me")
      .then((data) => {
        if (active) {
          setSession(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await postJson("/auth/logout", {});
    } finally {
      router.push("/login");
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px 0" }}>
      <div className="page-heading">
        <div>
          <h1>Your profile</h1>
          <p>Personal account details and active organization scope.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={handleLogout}
          style={{ color: "#ef4444" }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}>
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">User account</p>
              <h2>Personal information</h2>
            </div>
            <span className="status-chip status-chip-live">
              {session?.user?.platformRole ?? "ACTIVE"}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              padding: "16px 0",
            }}
          >
            <div className="signal-row">
              <UserCheck size={20} />
              <div>
                <strong>Full Name</strong>
                <p>{loading ? "Loading..." : (session?.user?.fullName ?? "Administrator")}</p>
              </div>
            </div>
            <div className="signal-row">
              <Mail size={20} />
              <div>
                <strong>Email Address</strong>
                <p>{loading ? "Loading..." : (session?.user?.email ?? "admin@ledgerly.com")}</p>
              </div>
            </div>
            <div className="signal-row">
              <ShieldCheck size={20} />
              <div>
                <strong>Assigned Role</strong>
                <p>{loading ? "Loading..." : (session?.role?.roleName ?? "Company Owner")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Active Tenant</p>
              <h2>Company Details</h2>
            </div>
            <span className="status-chip status-chip-live">Active Scope</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              padding: "16px 0",
            }}
          >
            <div className="signal-row">
              <Building2 size={20} />
              <div>
                <strong>Company Name</strong>
                <p>{loading ? "Loading..." : (session?.company?.name ?? "Ledgerly Enterprises")}</p>
              </div>
            </div>
            <div className="signal-row">
              <div>
                <strong>Base Currency</strong>
                <p>{loading ? "Loading..." : (session?.company?.baseCurrency ?? "USD")}</p>
              </div>
            </div>
            <div className="signal-row">
              <div>
                <strong>Tenant Identifier</strong>
                <p style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {loading ? "Loading..." : (session?.company?.id ?? "—")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="audit-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Session & Data Isolation Active</strong>
            <p>
              This session is cryptographically bound to your company tenant. Every query, mutation,
              and ledger entry is verified against PostgreSQL Row-Level Security policies.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
