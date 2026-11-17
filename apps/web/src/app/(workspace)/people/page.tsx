"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { getJson, patchApi, postApi } from "@/lib/api";

type TeamMember = {
  id: string; // membershipId
  userId: string;
  email: string;
  fullName: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  userStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  roleId: string;
  roleName: string;
  roleCode: string;
  isProtectedRole: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

type RoleOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isProtected: boolean;
};

export default function PeoplePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "LOCKED">(
    "ALL",
  );

  // Modals & Selected Member
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"password" | "health" | "details">(
    "password",
  );
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteTempPassword, setInviteTempPassword] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessCreds, setInviteSuccessCreds] = useState<{
    email: string;
    temporaryPassword?: string | undefined;
  } | null>(null);

  // Support / Password Operations State
  const [customPassword, setCustomPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatedPasswordValue, setGeneratedPasswordValue] = useState<string | null>(null);
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit details state
  const [editName, setEditName] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [membersData, rolesData] = await Promise.all([
        getJson<TeamMember[]>("/company-users"),
        getJson<RoleOption[]>("/company-users/roles"),
      ]);
      setMembers(membersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !inviteRoleId) {
        const defaultRole = rolesData.find((r) => !r.isProtected) ?? rolesData[0];
        if (defaultRole) {
          setInviteRoleId(defaultRole.id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleOpenSupport(member: TeamMember) {
    setSelectedMember(member);
    setActiveModalTab("password");
    setCustomPassword("");
    setGeneratedPasswordValue(null);
    setGeneratedResetLink(null);
    setActionSuccess(null);
    setActionError(null);
    setEditName(member.fullName);
    setEditRoleId(member.roleId);
  }

  function handleCloseSupport() {
    setSelectedMember(null);
    setGeneratedPasswordValue(null);
    setGeneratedResetLink(null);
    setActionSuccess(null);
    setActionError(null);
  }

  async function handleUnlockUser(member: TeamMember) {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await postApi(`/company-users/${member.id}/unlock`, {});
      setActionSuccess(`Account for ${member.fullName} was unlocked successfully.`);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, failedLoginAttempts: 0, lockedUntil: null } : m,
        ),
      );
      if (selectedMember?.id === member.id) {
        setSelectedMember((prev) =>
          prev ? { ...prev, failedLoginAttempts: 0, lockedUntil: null } : null,
        );
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to unlock account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGeneratePassword(member: TeamMember) {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    setGeneratedPasswordValue(null);
    try {
      const res = await postApi<{ generatedPassword: string }>(
        `/company-users/${member.id}/generate-password`,
        {},
      );
      setGeneratedPasswordValue(res.generatedPassword);
      setActionSuccess("A high-entropy password was generated and assigned to this user.");
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, failedLoginAttempts: 0, lockedUntil: null } : m,
        ),
      );
      if (selectedMember?.id === member.id) {
        setSelectedMember((prev) =>
          prev ? { ...prev, failedLoginAttempts: 0, lockedUntil: null } : null,
        );
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to generate password.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSetCustomPassword(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!selectedMember) return;
    if (customPassword.length < 12) {
      setActionError("Password must be at least 12 characters long.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await postApi(`/company-users/${selectedMember.id}/reset-password`, {
        newPassword: customPassword,
      });
      setActionSuccess(`Password for ${selectedMember.fullName} was updated successfully.`);
      setCustomPassword("");
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, failedLoginAttempts: 0, lockedUntil: null } : m,
        ),
      );
      setSelectedMember((prev) =>
        prev ? { ...prev, failedLoginAttempts: 0, lockedUntil: null } : null,
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateResetLink(member: TeamMember) {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    setGeneratedResetLink(null);
    try {
      const res = await postApi<{ resetToken: string; expiresAt: string }>(
        `/company-users/${member.id}/create-reset-link`,
        {},
      );
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/reset-password?token=${res.resetToken}`;
      setGeneratedResetLink(link);
      setActionSuccess("Password reset link generated (valid for 24 hours).");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to create reset link.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(member: TeamMember) {
    const nextStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await patchApi(`/company-users/${member.id}/status`, { status: nextStatus });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)),
      );
      if (selectedMember?.id === member.id) {
        setSelectedMember((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
      setActionSuccess(
        `User status changed to ${nextStatus === "ACTIVE" ? "Active" : "Suspended"}.`,
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to change user status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveDetails(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!selectedMember) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await patchApi(`/company-users/${selectedMember.id}/details`, {
        fullName: editName.trim(),
        roleId: editRoleId,
      });
      const updatedRole = roles.find((r) => r.id === editRoleId);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? {
                ...m,
                fullName: editName.trim(),
                roleId: editRoleId,
                roleName: updatedRole?.name ?? m.roleName,
              }
            : m,
        ),
      );
      setSelectedMember((prev) =>
        prev
          ? {
              ...prev,
              fullName: editName.trim(),
              roleId: editRoleId,
              roleName: updatedRole?.name ?? prev.roleName,
            }
          : null,
      );
      setActionSuccess("Member details and role assignment updated successfully.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update member details.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInviteSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setInviteSuccessCreds(null);
    try {
      const res = await postApi<{
        membershipId: string;
        email: string;
        temporaryPassword?: string;
      }>("/company-users/invite", {
        email: inviteEmail.trim(),
        fullName: inviteName.trim(),
        roleId: inviteRoleId,
        ...(inviteTempPassword.trim().length >= 12
          ? { temporaryPassword: inviteTempPassword.trim() }
          : {}),
      });
      setInviteSuccessCreds({
        email: res.email,
        temporaryPassword: res.temporaryPassword,
      });
      setInviteEmail("");
      setInviteName("");
      setInviteTempPassword("");
      void loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviting(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.roleName.toLowerCase().includes(searchQuery.toLowerCase());

    const isLocked = Boolean(m.lockedUntil && new Date(m.lockedUntil) > new Date());

    if (!matchesSearch) return false;
    if (statusFilter === "ACTIVE") return m.status === "ACTIVE";
    if (statusFilter === "SUSPENDED") return m.status === "SUSPENDED";
    if (statusFilter === "LOCKED") return isLocked || m.failedLoginAttempts > 0;
    return true;
  });

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const suspendedCount = members.filter((m) => m.status === "SUSPENDED").length;
  const lockedCount = members.filter(
    (m) =>
      Boolean(m.lockedUntil && new Date(m.lockedUntil) > new Date()) || m.failedLoginAttempts > 0,
  ).length;

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tenant Access & Identity Administration</p>
          <h1>Company Team & User Administration</h1>
          <p>
            Manage users, resolve authentication issues, reset or generate secure credentials, and
            govern tenant security.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setIsInviteOpen(true);
              setInviteSuccessCreds(null);
            }}
          >
            <UserPlus size={16} />
            Add Team Member
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="signal-row"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderColor: "#ef4444",
            marginBottom: "16px",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          <div>
            <strong style={{ color: "#ef4444" }}>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Summary KPI Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Users size={24} style={{ color: "var(--accent)" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total Users
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{members.length}</h3>
            </div>
          </div>
        </div>

        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <UserCheck size={24} style={{ color: "#22c55e" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Active Members
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ShieldAlert size={24} style={{ color: suspendedCount > 0 ? "#f59e0b" : "#94a3b8" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Suspended Access
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{suspendedCount}</h3>
            </div>
          </div>
        </div>

        <div
          className="inventory-panel"
          style={{
            padding: "16px 20px",
            borderColor: lockedCount > 0 ? "#ef4444" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Lock size={24} style={{ color: lockedCount > 0 ? "#ef4444" : "#22c55e" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Attention / Locked
              </p>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: lockedCount > 0 ? "#ef4444" : undefined,
                }}
              >
                {lockedCount}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`button ${statusFilter === "ALL" ? "button-primary" : "button-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "0.825rem" }}
            onClick={() => setStatusFilter("ALL")}
          >
            All Members ({members.length})
          </button>
          <button
            type="button"
            className={`button ${statusFilter === "ACTIVE" ? "button-primary" : "button-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "0.825rem" }}
            onClick={() => setStatusFilter("ACTIVE")}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`button ${statusFilter === "SUSPENDED" ? "button-primary" : "button-secondary"}`}
            style={{ padding: "6px 12px", fontSize: "0.825rem" }}
            onClick={() => setStatusFilter("SUSPENDED")}
          >
            Suspended ({suspendedCount})
          </button>
          <button
            type="button"
            className={`button ${statusFilter === "LOCKED" ? "button-primary" : "button-secondary"}`}
            style={{
              padding: "6px 12px",
              fontSize: "0.825rem",
              borderColor: lockedCount > 0 ? "#ef4444" : undefined,
              color: lockedCount > 0 && statusFilter !== "LOCKED" ? "#ef4444" : undefined,
            }}
            onClick={() => setStatusFilter("LOCKED")}
          >
            Needs Attention ({lockedCount})
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            className="text-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or role..."
            style={{ width: "100%", paddingLeft: "34px", paddingRight: "12px" }}
          />
        </div>
      </div>

      {/* Main Users Table */}
      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Assigned Role</th>
                <th scope="col">Access Status</th>
                <th scope="col">Security Health</th>
                <th scope="col">Last Login</th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Administrative Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px" }}>
                    Loading team accounts...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px" }}>
                    <Archive size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No users match your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isLocked = Boolean(
                    member.lockedUntil && new Date(member.lockedUntil) > new Date(),
                  );
                  const hasFailedAttempts = member.failedLoginAttempts > 0;

                  return (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: "rgba(59, 130, 246, 0.15)",
                              color: "#60a5fa",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                            }}
                          >
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ display: "block" }}>{member.fullName}</strong>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                                display: "block",
                              }}
                            >
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-chip"
                          style={{
                            background: member.isProtectedRole
                              ? "rgba(168, 85, 247, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                            color: member.isProtectedRole ? "#c084fc" : "#60a5fa",
                          }}
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
                          style={{
                            background:
                              member.status === "SUSPENDED" ? "rgba(239, 68, 68, 0.15)" : undefined,
                            color: member.status === "SUSPENDED" ? "#ef4444" : undefined,
                          }}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td>
                        {isLocked ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              className="status-chip"
                              style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#ef4444",
                                fontWeight: 700,
                              }}
                            >
                              LOCKED OUT
                            </span>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 8px", fontSize: "0.75rem", color: "#22c55e" }}
                              onClick={() => void handleUnlockUser(member)}
                              title="Instantly clear lockout"
                            >
                              <Unlock size={12} style={{ marginRight: "3px" }} /> Unlock
                            </button>
                          </div>
                        ) : hasFailedAttempts ? (
                          <span
                            className="status-chip"
                            style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
                          >
                            {member.failedLoginAttempts} failed attempts
                          </span>
                        ) : (
                          <span
                            className="status-chip"
                            style={{
                              background: "rgba(34, 197, 94, 0.1)",
                              color: "#22c55e",
                              fontSize: "0.75rem",
                            }}
                          >
                            ✓ Healthy
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          {member.lastLoginAt
                            ? new Date(member.lastLoginAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Never logged in"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ padding: "5px 12px", fontSize: "0.825rem" }}
                          onClick={() => handleOpenSupport(member)}
                        >
                          <KeyRound size={14} style={{ marginRight: "5px" }} />
                          Support & Recovery
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Support & Recovery Center Modal */}
      {selectedMember ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            className="inventory-panel"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <p className="eyebrow">User Diagnostics & Issue Resolution</p>
                <h2 style={{ margin: "4px 0" }}>{selectedMember.fullName}</h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                  {selectedMember.email} • Role: {selectedMember.roleName}
                </p>
              </div>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "6px", borderRadius: "50%" }}
                onClick={handleCloseSupport}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "8px",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                className={`button ${activeModalTab === "password" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "6px 12px", fontSize: "0.825rem" }}
                onClick={() => setActiveModalTab("password")}
              >
                <KeyRound size={14} style={{ marginRight: "4px" }} />
                Password & Access
              </button>
              <button
                type="button"
                className={`button ${activeModalTab === "health" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "6px 12px", fontSize: "0.825rem" }}
                onClick={() => setActiveModalTab("health")}
              >
                <Lock size={14} style={{ marginRight: "4px" }} />
                Account Status
              </button>
              <button
                type="button"
                className={`button ${activeModalTab === "details" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "6px 12px", fontSize: "0.825rem" }}
                onClick={() => setActiveModalTab("details")}
              >
                <UserCheck size={14} style={{ marginRight: "4px" }} />
                Role & Name
              </button>
            </div>

            {actionSuccess ? (
              <div
                className="signal-row"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  borderColor: "#22c55e",
                  marginBottom: "16px",
                }}
              >
                <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                <div>
                  <strong style={{ color: "#22c55e" }}>Success</strong>
                  <p>{actionSuccess}</p>
                </div>
              </div>
            ) : null}

            {actionError ? (
              <div
                className="signal-row"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderColor: "#ef4444",
                  marginBottom: "16px",
                }}
              >
                <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                <div>
                  <strong style={{ color: "#ef4444" }}>Action Failed</strong>
                  <p>{actionError}</p>
                </div>
              </div>
            ) : null}

            {/* TAB 1: Password Operations */}
            {activeModalTab === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 1. Generate Password Section */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--surface-muted, rgba(255,255,255,0.03))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem" }}>
                    Generate High-Entropy Password
                  </h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.825rem", color: "var(--muted)" }}>
                    Instantly generate a 16-character cryptographically secure password, clear any
                    active lockout, and sign out other sessions.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                    onClick={() => void handleGeneratePassword(selectedMember)}
                    disabled={actionLoading}
                  >
                    <KeyRound size={15} />
                    {actionLoading ? "Generating..." : "Generate & Assign New Password"}
                  </button>

                  {generatedPasswordValue ? (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px",
                        background: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid #22c55e",
                        borderRadius: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#22c55e",
                          textTransform: "uppercase",
                        }}
                      >
                        Generated Password (copy now)
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: "6px",
                        }}
                      >
                        <code
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            color: "var(--foreground)",
                          }}
                        >
                          {generatedPasswordValue}
                        </code>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          onClick={() => copyToClipboard(generatedPasswordValue, "gen-pass")}
                        >
                          <Copy size={13} style={{ marginRight: "4px" }} />
                          {copiedKey === "gen-pass" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                        }}
                      >
                        Provide this temporary password securely to {selectedMember.fullName}.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* 2. Set Custom Password Section */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--surface-muted, rgba(255,255,255,0.03))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem" }}>
                    Set Custom Password Manually
                  </h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.825rem", color: "var(--muted)" }}>
                    Directly define a specific password for this user (minimum 12 characters).
                  </p>
                  <form onSubmit={handleSetCustomPassword}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="password"
                        className="text-input"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="At least 12 characters"
                        style={{ flex: 1, padding: "8px 12px" }}
                        minLength={12}
                        required
                      />
                      <button
                        type="submit"
                        className="button button-secondary"
                        disabled={actionLoading || customPassword.length < 12}
                      >
                        Set Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. Generate Self-Service Reset Link */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--surface-muted, rgba(255,255,255,0.03))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.95rem" }}>
                    Generate 24-Hour Reset Link
                  </h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.825rem", color: "var(--muted)" }}>
                    Generate an authorized self-service password reset link to send via email or
                    chat.
                  </p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void handleCreateResetLink(selectedMember)}
                    disabled={actionLoading}
                  >
                    Generate Reset Link
                  </button>

                  {generatedResetLink ? (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        background: "var(--surface)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="text"
                          readOnly
                          value={generatedResetLink}
                          className="text-input"
                          style={{
                            flex: 1,
                            fontSize: "0.8rem",
                            padding: "6px 8px",
                            fontFamily: "monospace",
                          }}
                        />
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => copyToClipboard(generatedResetLink, "reset-link")}
                        >
                          <Copy size={13} style={{ marginRight: "4px" }} />
                          {copiedKey === "reset-link" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* TAB 2: Health & Status Operations */}
            {activeModalTab === "health" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    padding: "16px",
                    borderRadius: "8px",
                    background: "var(--surface-muted, rgba(255,255,255,0.03))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Lockout Status
                    </span>
                    <p style={{ margin: "4px 0", fontWeight: 700 }}>
                      {selectedMember.lockedUntil &&
                      new Date(selectedMember.lockedUntil) > new Date() ? (
                        <span style={{ color: "#ef4444" }}>
                          LOCKED (until {new Date(selectedMember.lockedUntil).toLocaleTimeString()})
                        </span>
                      ) : (
                        <span style={{ color: "#22c55e" }}>Unlocked / Normal</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Failed Login Counter
                    </span>
                    <p style={{ margin: "4px 0", fontWeight: 700 }}>
                      {selectedMember.failedLoginAttempts} / 5 max
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void handleUnlockUser(selectedMember)}
                    disabled={actionLoading}
                    style={{ color: "#22c55e" }}
                  >
                    <Unlock size={16} />
                    Reset Lockout & Failed Counter
                  </button>

                  {!selectedMember.isProtectedRole ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleToggleStatus(selectedMember)}
                      disabled={actionLoading}
                      style={{
                        color: selectedMember.status === "ACTIVE" ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {selectedMember.status === "ACTIVE" ? "Suspend Access" : "Activate Access"}
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* TAB 3: Edit Details & Role */}
            {activeModalTab === "details" && (
              <form
                onSubmit={handleSaveDetails}
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Company Role
                  </label>
                  {selectedMember.isProtectedRole ? (
                    <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                      This user holds the protected <strong>{selectedMember.roleName}</strong> role
                      and cannot be modified.
                    </p>
                  ) : (
                    <select
                      className="text-input"
                      value={editRoleId}
                      onChange={(e) => setEditRoleId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id} disabled={r.isProtected}>
                          {r.name} {r.description ? `— ${r.description}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ marginTop: "8px" }}>
                  <button type="submit" className="button button-primary" disabled={actionLoading}>
                    {actionLoading ? "Saving Changes..." : "Save Details & Role"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* Invite Member Modal */}
      {isInviteOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            className="inventory-panel"
            style={{
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <p className="eyebrow">Tenant Provisioning</p>
                <h2 style={{ margin: 0 }}>Add New Team Member</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "6px", borderRadius: "50%" }}
                onClick={() => setIsInviteOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {inviteSuccessCreds ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  className="signal-row"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.1)",
                    borderColor: "#22c55e",
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                  <div>
                    <strong style={{ color: "#22c55e" }}>User Added Successfully</strong>
                    <p>
                      An account and membership for <strong>{inviteSuccessCreds.email}</strong> was
                      created.
                    </p>
                  </div>
                </div>

                {inviteSuccessCreds.temporaryPassword ? (
                  <div
                    style={{
                      padding: "14px",
                      background: "var(--surface)",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Temporary Login Password
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "6px",
                      }}
                    >
                      <code style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                        {inviteSuccessCreds.temporaryPassword}
                      </code>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        onClick={() =>
                          copyToClipboard(inviteSuccessCreds.temporaryPassword ?? "", "invite-pass")
                        }
                      >
                        <Copy size={13} style={{ marginRight: "4px" }} />
                        {copiedKey === "invite-pass" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleInviteSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    style={{ width: "100%", padding: "8px 12px" }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="text-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="sarah@company.com"
                    style={{ width: "100%", padding: "8px 12px" }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Initial Role
                  </label>
                  <select
                    className="text-input"
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} disabled={r.isProtected}>
                        {r.name} {r.description ? `— ${r.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Custom Temporary Password (Optional)
                  </label>
                  <input
                    type="password"
                    className="text-input"
                    value={inviteTempPassword}
                    onChange={(e) => setInviteTempPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate a secure password"
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>

                <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={inviting || !inviteEmail || !inviteName}
                  >
                    <UserPlus size={16} />
                    {inviting ? "Provisioning..." : "Add Member"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <aside className="audit-note" style={{ marginTop: "24px" }}>
        <ShieldCheck size={18} />
        <div>
          <strong>Administrative Auditing & Isolation Active</strong>
          <p>
            All administrative actions, password resets, account unlocks, and role changes are
            cryptographically recorded in the immutable audit log with tenant scope, actor identity,
            and timestamp.
          </p>
        </div>
      </aside>
    </div>
  );
}
