"use client";

import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Tag,
} from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api";

type ExpenseCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  policyLimit: string | null;
  isActive: boolean;
};

type ExpenseLine = {
  id: string;
  lineNumber: number;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  expenseDate: string;
  amount: string;
  taxAmount: string;
  description: string;
  merchant: string | null;
  receiptUrl: string | null;
  costCenter: string | null;
};

type ExpenseClaim = {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  title: string;
  currency: string;
  totalAmount: string;
  totalTaxAmount: string;
  submissionDate: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "POSTED" | "PAID";
  notes: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  journalEntryId: string | null;
  paidAt: string | null;
  createdAt: string;
  lines?: ExpenseLine[];
};

type AccountItem = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type Section = "overview" | "claims" | "create" | "approvals" | "categories";

export function ExpenseScreen({ currentSection = "overview" }: { currentSection?: string }) {
  const [section, setSection] = useState<Section>(
    ["overview", "claims", "create", "approvals", "categories"].includes(currentSection)
      ? (currentSection as Section)
      : "overview",
  );

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // New Claim Form State
  const [claimTitle, setClaimTitle] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimLines, setClaimLines] = useState<
    {
      categoryId: string;
      expenseDate: string;
      amount: string;
      taxAmount: string;
      description: string;
      merchant: string;
    }[]
  >([
    {
      categoryId: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: "",
      taxAmount: "0",
      description: "",
      merchant: "",
    },
  ]);

  // New Category State
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatAccountId, setNewCatAccountId] = useState("");
  const [newCatLimit, setNewCatLimit] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [cats, clms, accs] = await Promise.allSettled([
        getJson<ExpenseCategory[]>("/expenses/categories"),
        getJson<ExpenseClaim[]>("/expenses/claims"),
        getJson<AccountItem[]>("/accounting/accounts"),
      ]);

      if (cats.status === "fulfilled") setCategories(cats.value);
      if (clms.status === "fulfilled") setClaims(clms.value);
      if (accs.status === "fulfilled") setAccounts(accs.value.filter((a) => a.type === "EXPENSE"));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [section]);

  // Compute total claim amount live
  const totalClaimSum = claimLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  // Handlers
  async function handleCreateClaim(e: SyntheticEvent) {
    e.preventDefault();
    if (totalClaimSum <= 0) {
      setMessage({ text: "Claim total amount must be greater than zero.", error: true });
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson("/expenses/claims", {
        title: claimTitle,
        notes: claimNotes || undefined,
        currency: "USD",
        lines: claimLines.map((l) => ({
          categoryId: l.categoryId,
          expenseDate: l.expenseDate,
          amount: l.amount,
          taxAmount: l.taxAmount || "0",
          description: l.description,
          merchant: l.merchant || undefined,
        })),
      });

      setMessage({ text: "Expense claim created successfully as DRAFT!" });
      setClaimTitle("");
      setClaimNotes("");
      setClaimLines([
        {
          categoryId: "",
          expenseDate: new Date().toISOString().slice(0, 10),
          amount: "",
          taxAmount: "0",
          description: "",
          merchant: "",
        },
      ]);
      setSection("claims");
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create claim",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmitClaim(id: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/expenses/claims/${id}/submit`, {});
      setMessage({ text: "Expense claim submitted for manager approval!" });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to submit claim",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveClaim(id: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/expenses/claims/${id}/approve`, {});
      setMessage({ text: "Expense claim APPROVED!" });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to approve claim",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectClaim(id: string) {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/expenses/claims/${id}/reject`, { reason });
      setMessage({ text: "Expense claim rejected." });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to reject claim",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePostClaimToGL(id: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/expenses/claims/${id}/post-to-gl`, {});
      setMessage({
        text: "Expense claim posted to General Ledger! Balanced journal entry created.",
      });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to post to General Ledger",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateCategory(e: SyntheticEvent) {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson("/expenses/categories", {
        code: newCatCode,
        name: newCatName,
        accountId: newCatAccountId || undefined,
        policyLimit: newCatLimit || undefined,
        isActive: true,
      });
      setMessage({ text: `Expense category ${newCatName} created!` });
      setNewCatCode("");
      setNewCatName("");
      setNewCatAccountId("");
      setNewCatLimit("");
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create category",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Expenses & Employee Claims
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employee expense submissions, manager approvals, policy limits, and direct
            General Ledger postings.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            message.error
              ? "border border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              : "border border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "overview", label: "Overview", icon: Receipt },
          { id: "claims", label: "All Claims", icon: FileText },
          { id: "create", label: "New Claim", icon: Plus },
          { id: "approvals", label: "Approvals & GL Posting", icon: CheckCircle2 },
          { id: "categories", label: "Expense Categories", icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id as Section)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION: Overview */}
      {section === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Claims</span>
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{claims.length.toString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">All time claims filed</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Pending Approval</span>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {claims.filter((c) => c.status === "SUBMITTED").length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting manager review</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Approved (Ready for GL)
                </span>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {claims.filter((c) => c.status === "APPROVED").length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Approved for reimbursement posting
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Posted to Accounting
                </span>
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {claims.filter((c) => c.status === "POSTED").length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Linked to General Ledger journals
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Recent Expense Submissions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Claim #</th>
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No expense claims submitted yet.
                      </td>
                    </tr>
                  ) : (
                    claims.slice(0, 5).map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-3 font-mono font-medium">{c.claimNumber}</td>
                        <td className="py-3 px-3">{c.employeeName}</td>
                        <td className="py-3 px-3 font-medium">{c.title}</td>
                        <td className="py-3 px-3 font-mono font-bold">${c.totalAmount}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              c.status === "APPROVED" || c.status === "POSTED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : c.status === "SUBMITTED"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : c.status === "DRAFT"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Create Claim */}
      {section === "create" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              New Expense Claim
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              Total: ${totalClaimSum.toFixed(2)}
            </span>
          </h2>

          <form onSubmit={(e) => void handleCreateClaim(e)} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Claim Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 Client Dinner & Travel to Chicago"
                  value={claimTitle}
                  onChange={(e) => setClaimTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Notes / Justification
                </label>
                <input
                  type="text"
                  placeholder="Optional context or business purpose"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 w-36">Date</th>
                    <th className="px-3 py-2 w-32">Amount ($)</th>
                    <th className="px-3 py-2">Merchant</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {claimLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <select
                          required
                          value={line.categoryId}
                          onChange={(e) => {
                            const updated = [...claimLines];
                            const cur = updated[idx];
                            if (cur) cur.categoryId = e.target.value;
                            setClaimLines(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        >
                          <option value="">Select Category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.policyLimit ? `(Limit: $${c.policyLimit})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          required
                          value={line.expenseDate}
                          onChange={(e) => {
                            const updated = [...claimLines];
                            const cur = updated[idx];
                            if (cur) cur.expenseDate = e.target.value;
                            setClaimLines(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(e) => {
                            const updated = [...claimLines];
                            const cur = updated[idx];
                            if (cur) cur.amount = e.target.value;
                            setClaimLines(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. Delta Airlines"
                          value={line.merchant}
                          onChange={(e) => {
                            const updated = [...claimLines];
                            const cur = updated[idx];
                            if (cur) cur.merchant = e.target.value;
                            setClaimLines(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          placeholder="Flight to client site"
                          value={line.description}
                          onChange={(e) => {
                            const updated = [...claimLines];
                            const cur = updated[idx];
                            if (cur) cur.description = e.target.value;
                            setClaimLines(updated);
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {claimLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setClaimLines(claimLines.filter((_, i) => i !== idx))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setClaimLines([
                    ...claimLines,
                    {
                      categoryId: "",
                      expenseDate: new Date().toISOString().slice(0, 10),
                      amount: "",
                      taxAmount: "0",
                      description: "",
                      merchant: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Add Expense Item
              </button>

              <button
                type="submit"
                disabled={actionLoading || totalClaimSum <= 0}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "Saving Claim..." : "Create Draft Claim"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: Claims List */}
      {section === "claims" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim #</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Submission Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No expense claims found.
                    </td>
                  </tr>
                ) : (
                  claims.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {c.claimNumber}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-foreground">{c.employeeName}</span>
                        <span className="block text-muted-foreground">{c.employeeEmail}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{c.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.submissionDate ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">${c.totalAmount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            c.status === "APPROVED" || c.status === "POSTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : c.status === "SUBMITTED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : c.status === "DRAFT"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === "DRAFT" && (
                          <button
                            onClick={() => void handleSubmitClaim(c.id)}
                            disabled={actionLoading}
                            className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            Submit Claim
                          </button>
                        )}
                        {c.status === "POSTED" && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            GL Posted ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Approvals Workbench */}
      {section === "approvals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Manager Approval & GL Posting Workbench
            </h2>
            <p className="text-xs text-muted-foreground">
              Review submitted claims, approve, reject, or post to General Ledger
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Claim #</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.filter((c) => c.status === "SUBMITTED" || c.status === "APPROVED")
                  .length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No claims pending approval or GL posting.
                    </td>
                  </tr>
                ) : (
                  claims
                    .filter((c) => c.status === "SUBMITTED" || c.status === "APPROVED")
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold">{c.claimNumber}</td>
                        <td className="px-4 py-3 text-xs">{c.employeeName}</td>
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3 font-mono font-bold">${c.totalAmount}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              c.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {c.status === "SUBMITTED" && (
                            <>
                              <button
                                onClick={() => void handleApproveClaim(c.id)}
                                disabled={actionLoading}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => void handleRejectClaim(c.id)}
                                disabled={actionLoading}
                                className="rounded border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {c.status === "APPROVED" && (
                            <button
                              onClick={() => void handlePostClaimToGL(c.id)}
                              disabled={actionLoading}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Post to GL
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Categories */}
      {section === "categories" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Expense Categories & Policy Limits
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">GL Account Mapped</th>
                    <th className="px-4 py-3">Policy Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No expense categories defined.
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-xs">
                          {c.accountCode ? (
                            <span className="font-mono font-semibold text-foreground">
                              {c.accountCode} - {c.accountName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Default GL Account</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {c.policyLimit ? `$${c.policyLimit}` : "No limit"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Category Form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              New Category
            </h2>
            <form onSubmit={(e) => void handleCreateCategory(e)} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Category Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MARKETING"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advertising & Promo"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  GL Expense Account
                </label>
                <select
                  value={newCatAccountId}
                  onChange={(e) => setNewCatAccountId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Default Expense Account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Policy Limit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
