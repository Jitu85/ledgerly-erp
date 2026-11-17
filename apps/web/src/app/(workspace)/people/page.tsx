"use client";

import { useEffect, useState } from "react";
import { Archive, ShieldCheck } from "lucide-react";
import { getJson, patchApi } from "@/lib/api";

type TeamMember = {
  id: string;
  email: string;
  fullName: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  roleId: string;
  roleName: string;
};

export default function PeoplePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getJson<TeamMember[]>("/company-users")
      .then((data) => {
        if (active) {
          setMembers(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load company users");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleStatus(member: TeamMember) {
    const nextStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUpdatingId(member.id);
    try {
      await patchApi(`/company-users/${member.id}/status`, { status: nextStatus });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tenant Access & Governance</p>
          <h1>Company Team & Permissions</h1>
          <p>
            Manage authenticated staff members and role-based access strictly within this company.
          </p>
        </div>
      </div>

      {error ? (
        <div
          className="signal-row"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
        >
          <div>
            <strong>Error loading users</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <section className="inventory-panel table-panel">
        <div className="panel-heading" style={{ padding: "16px 20px" }}>
          <div>
            <h2>Active Members</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>
              {members.length} team {members.length === 1 ? "member" : "members"} provisioned
            </p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No company users found.</p>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.fullName}</strong>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span
                        className="status-chip"
                        style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
                      >
                        {member.roleName}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-chip ${
                          member.status === "ACTIVE"
                            ? "status-chip-live"
                            : member.status === "INVITED"
                              ? "status-chip-warning"
                              : ""
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        type="button"
                        disabled={updatingId === member.id}
                        onClick={() => toggleStatus(member)}
                      >
                        {updatingId === member.id
                          ? "Updating..."
                          : member.status === "ACTIVE"
                            ? "Suspend"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="audit-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Tenant boundary isolation verified</strong>
          <p>
            Users have access only to data under the current verified company context. Role
            assignments and status changes are permanently recorded in the immutable audit log.
          </p>
        </div>
      </aside>
    </div>
  );
}
