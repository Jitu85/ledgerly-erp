"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getJson, patchApi, postApi } from "@/lib/api";
import type { SupportMessageDto } from "@erp/types";

type MeResponse = {
  user: { id: string; email: string; fullName: string; platformRole: string } | null;
  company: { id: string; name: string; slug: string; baseCurrency: string } | null;
  role: { membershipId: string; roleId: string; roleName: string } | null;
};

export function SupportScreen() {
  const [messages, setMessages] = useState<SupportMessageDto[]>([]);
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessageDto | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<"RESOLVED" | "IN_PROGRESS" | "CLOSED">("RESOLVED");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // New message modal state
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState<
    "ACCOUNT" | "BUG" | "ACCESS" | "BILLING" | "GENERAL"
  >("GENERAL");
  const [newPriority, setNewPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingNew, setSendingNew] = useState(false);
  const [newSuccess, setNewSuccess] = useState<string | null>(null);

  const isAdmin =
    session?.user?.platformRole === "SUPER_ADMIN" ||
    session?.role?.roleName === "Company Owner" ||
    session?.role?.roleName === "Company Admin";

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const me = await getJson<MeResponse>("/auth/me");
      setSession(me);

      const isUserAdmin =
        me.user?.platformRole === "SUPER_ADMIN" ||
        me.role?.roleName === "Company Owner" ||
        me.role?.roleName === "Company Admin";

      const endpoint = isUserAdmin ? "/support/admin/messages" : "/support/my-messages";
      const msgs = await getJson<SupportMessageDto[]>(endpoint);
      setMessages(msgs);
      if (msgs.length > 0 && !selectedMessage) {
        setSelectedMessage(msgs[0] ?? null);
      } else if (selectedMessage) {
        const refreshed = msgs.find((m) => m.id === selectedMessage.id);
        if (refreshed) setSelectedMessage(refreshed);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support inquiries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSendReply(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!selectedMessage) return;
    if (replyText.trim().length === 0) {
      setReplyError("Please enter a response message.");
      return;
    }

    setSubmittingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      await postApi(`/support/messages/${selectedMessage.id}/reply`, {
        reply: replyText.trim(),
        status: replyStatus,
      });

      setReplySuccess("Your response was submitted and the ticket was updated.");
      setReplyText("");
      void loadData();
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleQuickStatusChange(
    msgId: string,
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) {
    try {
      await patchApi(`/support/messages/${msgId}/status`, { status });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, status } : m)));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update ticket status");
    }
  }

  async function handleCreateMessage(e: React.SyntheticEvent) {
    e.preventDefault();
    if (newSubject.trim().length < 3 || newMessageText.trim().length < 5) {
      alert("Subject must be at least 3 characters and message at least 5 characters.");
      return;
    }

    setSendingNew(true);
    setNewSuccess(null);

    try {
      const created = await postApi<SupportMessageDto>("/support/messages", {
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        message: newMessageText.trim(),
      });

      setNewSuccess("Your message was sent to the administrator.");
      setNewSubject("");
      setNewMessageText("");
      setMessages((prev) => [created, ...prev]);
      setSelectedMessage(created);
      setIsNewMessageOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingNew(false);
    }
  }

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || m.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openCount = messages.filter((m) => m.status === "OPEN").length;
  const inProgressCount = messages.filter((m) => m.status === "IN_PROGRESS").length;
  const resolvedCount = messages.filter(
    (m) => m.status === "RESOLVED" || m.status === "CLOSED",
  ).length;

  return (
    <div className="inventory-page">
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">User Communication & In-App Support</p>
          <h1>{isAdmin ? "Admin Support Inbox" : "Help & Support Inquiries"}</h1>
          <p>
            {isAdmin
              ? "Receive and resolve issues submitted by team members directly inside the application."
              : "Send messages directly to company administrators and track issue resolution."}
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
              setIsNewMessageOpen(true);
              setNewSuccess(null);
            }}
          >
            <MessageSquarePlus size={16} />
            New Message
          </button>
        </div>
      </div>

      {newSuccess ? (
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
            <strong style={{ color: "#22c55e" }}>Message Sent</strong>
            <p>{newSuccess}</p>
          </div>
        </div>
      ) : null}

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

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <MessageSquare size={24} style={{ color: "var(--accent)" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total Inquiries
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{messages.length}</h3>
            </div>
          </div>
        </div>

        <div
          className="inventory-panel"
          style={{
            padding: "16px 20px",
            borderColor: openCount > 0 ? "#ef4444" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={24} style={{ color: openCount > 0 ? "#ef4444" : "#22c55e" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Open Issues
              </p>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: openCount > 0 ? "#ef4444" : undefined,
                }}
              >
                {openCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Clock size={24} style={{ color: inProgressCount > 0 ? "#f59e0b" : "#94a3b8" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                In Progress
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{inProgressCount}</h3>
            </div>
          </div>
        </div>

        <div className="inventory-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle2 size={24} style={{ color: "#22c55e" }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Resolved
              </p>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{resolvedCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inbox Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Tickets List */}
        <section className="inventory-panel" style={{ padding: "16px" }}>
          {/* Search & Filters */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={15}
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
                placeholder="Search subject, sender, or text..."
                style={{ width: "100%", paddingLeft: "32px", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`button ${statusFilter === "ALL" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                onClick={() => setStatusFilter("ALL")}
              >
                All
              </button>
              <button
                type="button"
                className={`button ${statusFilter === "OPEN" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                onClick={() => setStatusFilter("OPEN")}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                className={`button ${statusFilter === "IN_PROGRESS" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                onClick={() => setStatusFilter("IN_PROGRESS")}
              >
                In Progress
              </button>
              <button
                type="button"
                className={`button ${statusFilter === "RESOLVED" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                onClick={() => setStatusFilter("RESOLVED")}
              >
                Resolved
              </button>
              <select
                className="text-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ padding: "2px 6px", fontSize: "0.75rem" }}
              >
                <option value="ALL">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="ACCOUNT">Account</option>
                <option value="BUG">Bugs</option>
                <option value="ACCESS">Access</option>
                <option value="BILLING">Billing</option>
              </select>
            </div>
          </div>

          {/* List items */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "600px",
              overflowY: "auto",
            }}
          >
            {loading ? (
              <p style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0" }}>
                Loading inquiries...
              </p>
            ) : filteredMessages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
                <Archive size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: "0.875rem" }}>No support messages found.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const isOpen = msg.status === "OPEN";

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setReplySuccess(null);
                      setReplyError(null);
                    }}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: isSelected
                        ? "var(--accent, #3b82f6)"
                        : isOpen
                          ? "rgba(239, 68, 68, 0.4)"
                          : "var(--border)",
                      background: isSelected
                        ? "var(--surface-muted, rgba(59, 130, 246, 0.08))"
                        : "var(--surface)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
                        {msg.subject}
                      </strong>
                      <span
                        className={`status-chip ${
                          msg.status === "RESOLVED"
                            ? "status-chip-live"
                            : msg.status === "OPEN"
                              ? "status-chip-warning"
                              : ""
                        }`}
                        style={{
                          fontSize: "0.7rem",
                          padding: "1px 6px",
                          minHeight: "18px",
                          background:
                            msg.status === "OPEN"
                              ? "rgba(239, 68, 68, 0.15)"
                              : msg.status === "IN_PROGRESS"
                                ? "rgba(245, 158, 11, 0.15)"
                                : undefined,
                          color:
                            msg.status === "OPEN"
                              ? "#ef4444"
                              : msg.status === "IN_PROGRESS"
                                ? "#f59e0b"
                                : undefined,
                        }}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "4px 0",
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {msg.message}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "6px",
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      <span>
                        {msg.senderName} • {msg.category}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Selected Message Details & Reply Panel */}
        <section className="inventory-panel" style={{ padding: "20px" }}>
          {selectedMessage ? (
            <div>
              {/* Message Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                    <span
                      className="status-chip"
                      style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
                    >
                      {selectedMessage.category}
                    </span>
                    <span
                      className="status-chip"
                      style={{
                        background:
                          selectedMessage.priority === "URGENT"
                            ? "rgba(239, 68, 68, 0.2)"
                            : selectedMessage.priority === "HIGH"
                              ? "rgba(245, 158, 11, 0.2)"
                              : "rgba(100, 116, 139, 0.15)",
                        color:
                          selectedMessage.priority === "URGENT"
                            ? "#ef4444"
                            : selectedMessage.priority === "HIGH"
                              ? "#f59e0b"
                              : "var(--muted)",
                      }}
                    >
                      {selectedMessage.priority} Priority
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{selectedMessage.subject}</h2>
                </div>

                {isAdmin ? (
                  <select
                    className="text-input"
                    value={selectedMessage.status}
                    onChange={(e) =>
                      void handleQuickStatusChange(
                        selectedMessage.id,
                        e.target.value as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
                      )
                    }
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                  >
                    <option value="OPEN">Mark Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                ) : (
                  <span
                    className={`status-chip ${selectedMessage.status === "RESOLVED" ? "status-chip-live" : ""}`}
                  >
                    {selectedMessage.status}
                  </span>
                )}
              </div>

              {/* Sender Details */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(59, 130, 246, 0.15)",
                    color: "#60a5fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                  }}
                >
                  {selectedMessage.senderName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ fontSize: "0.875rem", display: "block" }}>
                    {selectedMessage.senderName}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    {selectedMessage.senderEmail} • Sent{" "}
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "var(--surface-muted, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border)",
                  fontSize: "0.925rem",
                  lineHeight: "1.6",
                  marginBottom: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedMessage.message}
              </div>

              {/* Account issue shortcut */}
              {isAdmin &&
              (selectedMessage.category === "ACCOUNT" ||
                selectedMessage.message.toLowerCase().includes("password") ||
                selectedMessage.message.toLowerCase().includes("locked") ||
                selectedMessage.message.toLowerCase().includes("login")) ? (
                <div
                  className="signal-row"
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderColor: "#3b82f6",
                    marginBottom: "20px",
                  }}
                >
                  <Users size={18} style={{ color: "#3b82f6" }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#3b82f6" }}>Account Support Shortcut</strong>
                    <p style={{ margin: "2px 0 6px 0" }}>
                      This message mentions login, password, or account access. You can reset their
                      credentials or unlock their account in the People directory.
                    </p>
                    <Link
                      href="/people"
                      className="button button-secondary"
                      style={{ padding: "3px 10px", fontSize: "0.75rem", display: "inline-block" }}
                    >
                      Open People & Reset Credentials →
                    </Link>
                  </div>
                </div>
              ) : null}

              {/* Admin Reply History */}
              {selectedMessage.adminReply ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <strong style={{ color: "#22c55e", fontSize: "0.85rem" }}>
                      Administrator Response
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {selectedMessage.repliedAt
                        ? new Date(selectedMessage.repliedAt).toLocaleString()
                        : "Replied"}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedMessage.adminReply}
                  </p>
                </div>
              ) : null}

              {/* Admin Reply Box */}
              {isAdmin ? (
                <form
                  onSubmit={handleSendReply}
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "0.9rem" }}>
                    {selectedMessage.adminReply ? "Send Another Response" : "Respond to Inquiry"}
                  </h4>

                  {replySuccess ? (
                    <div
                      className="signal-row"
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                        borderColor: "#22c55e",
                      }}
                    >
                      <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
                      <p style={{ margin: 0, color: "#22c55e", fontSize: "0.85rem" }}>
                        {replySuccess}
                      </p>
                    </div>
                  ) : null}

                  {replyError ? (
                    <div
                      className="signal-row"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderColor: "#ef4444",
                      }}
                    >
                      <AlertTriangle size={16} style={{ color: "#ef4444" }} />
                      <p style={{ margin: 0, color: "#ef4444", fontSize: "0.85rem" }}>
                        {replyError}
                      </p>
                    </div>
                  ) : null}

                  <textarea
                    className="text-input"
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type response to help user solve their problem..."
                    style={{ width: "100%", padding: "10px", fontSize: "0.875rem" }}
                    required
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Status:</span>
                      <select
                        className="text-input"
                        value={replyStatus}
                        onChange={(e) =>
                          setReplyStatus(e.target.value as "RESOLVED" | "IN_PROGRESS" | "CLOSED")
                        }
                        style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                      >
                        <option value="RESOLVED">Resolved</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={submittingReply || replyText.trim().length === 0}
                    >
                      <Send size={15} />
                      {submittingReply ? "Sending..." : "Submit Response"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
              <LifeBuoy size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>Select a support message to view details</p>
            </div>
          )}
        </section>
      </div>

      {/* New Message Modal */}
      {isNewMessageOpen ? (
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
                <p className="eyebrow">Direct Administrator Communication</p>
                <h2 style={{ margin: 0 }}>Send Message to Admin</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "4px 8px" }}
                onClick={() => setIsNewMessageOpen(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateMessage}
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
                  Subject / Summary of Issue
                </label>
                <input
                  type="text"
                  className="text-input"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Cannot generate purchase invoice"
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                  minLength={3}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Category
                  </label>
                  <select
                    className="text-input"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(
                        e.target.value as "ACCOUNT" | "BUG" | "ACCESS" | "BILLING" | "GENERAL",
                      )
                    }
                    style={{ width: "100%", padding: "8px 12px" }}
                  >
                    <option value="GENERAL">General Support</option>
                    <option value="ACCOUNT">Account & Password Issue</option>
                    <option value="BUG">System Bug / Error</option>
                    <option value="ACCESS">Role & Permissions Access</option>
                    <option value="BILLING">Billing & Plans</option>
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
                    Urgency
                  </label>
                  <select
                    className="text-input"
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(e.target.value as "LOW" | "NORMAL" | "HIGH" | "URGENT")
                    }
                    style={{ width: "100%", padding: "8px 12px" }}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent Block</option>
                  </select>
                </div>
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
                  Describe Your Problem
                </label>
                <textarea
                  className="text-input"
                  rows={4}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Provide specific details about what you were doing or what error you received..."
                  style={{ width: "100%", padding: "8px 12px", fontSize: "0.875rem" }}
                  required
                  minLength={5}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={sendingNew || newSubject.trim().length < 3}
                >
                  <Send size={15} />
                  {sendingNew ? "Sending Message..." : "Send to Administrator"}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewMessageOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
