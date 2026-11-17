"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getJson, patchApi, postApi, postJson } from "@/lib/api";

type MeResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    platformRole: string;
    status?: string;
    emailVerifiedAt?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string;
  } | null;
  company: { id: string; name: string; slug: string; baseCurrency: string } | null;
  role: { membershipId: string; roleId: string; roleName: string } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<MeResponse>("/auth/me")
      .then((data) => {
        if (active) {
          setSession(data);
          setFullNameInput(data.user?.fullName ?? "");
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

  async function handleSaveName(e: React.SyntheticEvent) {
    e.preventDefault();
    if (fullNameInput.trim().length < 2) {
      setNameError("Full name must be at least 2 characters.");
      return;
    }

    setSavingName(true);
    setNameError(null);
    setNameSuccess(null);

    try {
      const res = await patchApi<{ status: string; fullName: string }>("/auth/profile", {
        fullName: fullNameInput.trim(),
      });
      setSession((prev) =>
        prev?.user ? { ...prev, user: { ...prev.user, fullName: res.fullName } } : prev,
      );
      setNameSuccess("Profile name updated successfully.");
      setIsEditingName(false);
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to update profile name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.SyntheticEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 12) {
      setPasswordError("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await postApi("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Your password was updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  const createdDate = session?.user?.createdAt
    ? new Date(session.user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const lastLoginDate = session?.user?.lastLoginAt
    ? new Date(session.user.lastLoginAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Active in current session";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "16px 0" }}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personal Account & Security</p>
          <h1>User Profile</h1>
          <p>Manage your personal profile information, security credentials, and company scope.</p>
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
        {/* Profile Card */}
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Personal Details</p>
              <h2>Account Information</h2>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span className="status-chip status-chip-live">
                {session?.user?.status ?? "ACTIVE"}
              </span>
              {session?.user?.platformRole === "SUPER_ADMIN" ? (
                <span
                  className="status-chip"
                  style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}
                >
                  SUPER ADMIN
                </span>
              ) : null}
            </div>
          </div>

          {nameSuccess ? (
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
                <p>{nameSuccess}</p>
              </div>
            </div>
          ) : null}

          {nameError ? (
            <div
              className="signal-row"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "#ef4444",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong style={{ color: "#ef4444" }}>Error</strong>
                <p>{nameError}</p>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              padding: "16px 0",
            }}
          >
            <div className="signal-row" style={{ alignItems: "flex-start" }}>
              <UserCheck size={20} style={{ marginTop: "3px" }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>Full Name</strong>
                  {!isEditingName ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "2px 8px", fontSize: "0.75rem", display: "inline-flex" }}
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit2 size={12} style={{ marginRight: "4px" }} /> Edit
                    </button>
                  ) : null}
                </div>
                {isEditingName ? (
                  <form onSubmit={handleSaveName} style={{ marginTop: "8px" }}>
                    <input
                      type="text"
                      className="text-input"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        fontSize: "0.875rem",
                        width: "100%",
                        marginBottom: "8px",
                      }}
                      required
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="submit"
                        className="button button-primary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        disabled={savingName}
                      >
                        {savingName ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        onClick={() => {
                          setIsEditingName(false);
                          setFullNameInput(session?.user?.fullName ?? "");
                          setNameError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p>{loading ? "Loading..." : (session?.user?.fullName ?? "—")}</p>
                )}
              </div>
            </div>

            <div className="signal-row">
              <Mail size={20} />
              <div>
                <strong>Email Address</strong>
                <p>{loading ? "Loading..." : (session?.user?.email ?? "—")}</p>
              </div>
            </div>

            <div className="signal-row">
              <ShieldCheck size={20} />
              <div>
                <strong>Company Role</strong>
                <p>{loading ? "Loading..." : (session?.role?.roleName ?? "Standard User")}</p>
              </div>
            </div>

            <div className="signal-row">
              <Calendar size={20} />
              <div>
                <strong>Member Since</strong>
                <p>{loading ? "Loading..." : createdDate}</p>
              </div>
            </div>

            <div className="signal-row">
              <Clock size={20} />
              <div>
                <strong>Last Login</strong>
                <p>{loading ? "Loading..." : lastLoginDate}</p>
              </div>
            </div>

            <div className="signal-row">
              <Lock size={20} />
              <div>
                <strong>User Identifier</strong>
                <p style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {loading ? "Loading..." : (session?.user?.id ?? "—")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Password & Security Card */}
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Security Credentials</p>
              <h2>Change Password</h2>
            </div>
          </div>

          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "16px" }}>
            Passwords must contain at least 12 characters. Updating your password will sign out
            other active sessions.
          </p>

          {passwordSuccess ? (
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
                <p>{passwordSuccess}</p>
              </div>
            </div>
          ) : null}

          {passwordError ? (
            <div
              className="signal-row"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "#ef4444",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong style={{ color: "#ef4444" }}>Error</strong>
                <p>{passwordError}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleChangePassword} style={{ maxWidth: "480px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Current Password
                </label>
                <input
                  type="password"
                  className="text-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  <span>New Password</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: newPassword.length >= 12 ? "#22c55e" : "var(--muted)",
                    }}
                  >
                    {newPassword.length >= 12
                      ? "✓ 12+ chars"
                      : `${newPassword.length.toString()}/12 min`}
                  </span>
                </label>
                <input
                  type="password"
                  className="text-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                  minLength={12}
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
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="text-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={changingPassword || newPassword.length < 12}
                >
                  <KeyRound size={16} />
                  {changingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Company Scope Card */}
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Organization Scope</p>
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
                <p>{loading ? "Loading..." : (session?.company?.name ?? "—")}</p>
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
                <strong>Company Identifier</strong>
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
              Your session is cryptographically bound to your user identity and company tenant. All
              queries and mutations are scoped and verified under PostgreSQL Row-Level Security.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
