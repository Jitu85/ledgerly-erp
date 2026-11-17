"use client";

import {
  BookOpen,
  Calculator,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
} from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { getJson, patchJson, postJson } from "@/lib/api";

type AccountItem = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
  currency: string;
  description: string | null;
  isControlAccount: boolean;
  isActive: boolean;
};

type AccountingPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "SOFT_CLOSED" | "LOCKED";
  closedAt: string | null;
};

type JournalLine = {
  id: string;
  lineNumber: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: string;
  credit: string;
  description: string | null;
};

type JournalEntry = {
  id: string;
  entryNumber: string;
  entryType: string;
  sourceModule: string | null;
  businessDate: string;
  status: "DRAFT" | "POSTED" | "REVERSED";
  isBalanced: boolean;
  totalDebit: string;
  totalCredit: string;
  description: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  lines?: JournalLine[];
};

type GeneralLedgerRow = {
  lineId: string;
  journalEntryId: string;
  entryNumber: string;
  businessDate: string;
  entryDescription: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: string;
  credit: string;
  description: string | null;
  runningBalance: string;
};

type TrialBalanceItem = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: string;
  totalCredit: string;
  netDebit: string;
  netCredit: string;
};

type TrialBalanceResponse = {
  asOfDate: string;
  isBalanced: boolean;
  grandTotalDebit: string;
  grandTotalCredit: string;
  items: TrialBalanceItem[];
};

type Section = "overview" | "accounts" | "journals" | "ledger" | "trial-balance" | "periods";

export function AccountingScreen({ currentSection = "overview" }: { currentSection?: string }) {
  const [section, setSection] = useState<Section>(
    ["overview", "accounts", "journals", "ledger", "trial-balance", "periods"].includes(
      currentSection,
    )
      ? (currentSection as Section)
      : "overview",
  );

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [ledgerRows, setLedgerRows] = useState<GeneralLedgerRow[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [search, setSearch] = useState("");

  // Create Account State
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<string>("EXPENSE");
  const [newAccountDesc, setNewAccountDesc] = useState("");

  // Create Period State
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");

  // Create Journal Entry State
  const [journalDate, setJournalDate] = useState(new Date().toISOString().slice(0, 10));
  const [journalDesc, setJournalDesc] = useState("");
  const [journalLines, setJournalLines] = useState<
    { accountId: string; debit: string; credit: string; description: string }[]
  >([
    { accountId: "", debit: "0", credit: "0", description: "" },
    { accountId: "", debit: "0", credit: "0", description: "" },
  ]);

  // Load accounting data
  async function loadData() {
    setLoading(true);
    try {
      const [accRes, perRes, jourRes, tbRes] = await Promise.allSettled([
        getJson<AccountItem[]>("/accounting/accounts"),
        getJson<AccountingPeriod[]>("/accounting/periods"),
        getJson<JournalEntry[]>("/accounting/journal-entries"),
        getJson<TrialBalanceResponse>("/accounting/trial-balance"),
      ]);

      if (accRes.status === "fulfilled") setAccounts(accRes.value);
      if (perRes.status === "fulfilled") setPeriods(perRes.value);
      if (jourRes.status === "fulfilled") setJournals(jourRes.value);
      if (tbRes.status === "fulfilled") setTrialBalance(tbRes.value);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLedger(accountId?: string) {
    setLoading(true);
    try {
      const url = accountId
        ? `/accounting/general-ledger?accountId=${accountId}`
        : "/accounting/general-ledger";
      const rows = await getJson<GeneralLedgerRow[]>(url);
      setLedgerRows(rows);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    if (section === "ledger") {
      void loadLedger();
    }
  }, [section]);

  // Compute live journal entry debit and credit totals
  const totalDebitSum = journalLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCreditSum = journalLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebitSum - totalCreditSum) < 0.0001 && totalDebitSum > 0;

  // Handlers
  async function handleCreateAccount(e: SyntheticEvent) {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson("/accounting/accounts", {
        code: newAccountCode,
        name: newAccountName,
        type: newAccountType,
        description: newAccountDesc || undefined,
        currency: "USD",
        isActive: true,
      });
      setMessage({ text: `Account ${newAccountCode} - ${newAccountName} created successfully!` });
      setNewAccountCode("");
      setNewAccountName("");
      setNewAccountDesc("");
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create account",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreatePeriod(e: SyntheticEvent) {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson("/accounting/periods", {
        name: newPeriodName,
        startDate: newPeriodStart,
        endDate: newPeriodEnd,
        status: "OPEN",
      });
      setMessage({ text: `Accounting period ${newPeriodName} created!` });
      setNewPeriodName("");
      setNewPeriodStart("");
      setNewPeriodEnd("");
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create period",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdatePeriodStatus(id: string, status: "OPEN" | "SOFT_CLOSED" | "LOCKED") {
    setActionLoading(true);
    setMessage(null);
    try {
      await patchJson(`/accounting/periods/${id}/status`, { status });
      setMessage({ text: `Period status changed to ${status}` });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update period status",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateJournal(e: SyntheticEvent) {
    e.preventDefault();
    if (!isJournalBalanced) {
      setMessage({
        text: "Journal entry is unbalanced. Total debits must equal total credits.",
        error: true,
      });
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson("/accounting/journal-entries", {
        businessDate: journalDate,
        description: journalDesc,
        entryType: "MANUAL",
        lines: journalLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || "0",
          credit: l.credit || "0",
          description: l.description || undefined,
        })),
      });
      setMessage({ text: "Draft journal entry created successfully!" });
      setJournalDesc("");
      setJournalLines([
        { accountId: "", debit: "0", credit: "0", description: "" },
        { accountId: "", debit: "0", credit: "0", description: "" },
      ]);
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to create journal entry",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePostJournal(id: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/accounting/journal-entries/${id}/post`, {});
      setMessage({ text: "Journal entry posted to General Ledger!" });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to post journal entry",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReverseJournal(id: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await postJson(`/accounting/journal-entries/${id}/reverse`, {
        reason: "User requested reversal",
      });
      setMessage({ text: "Journal entry reversed with linked balancing entry." });
      void loadData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to reverse journal entry",
        error: true,
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Filter accounts
  const filteredAccounts = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Core Accounting & General Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Strict double-entry bookkeeping, immutable general ledger, and period closing controls.
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
          { id: "overview", label: "Overview", icon: Scale },
          { id: "accounts", label: "Chart of Accounts", icon: BookOpen },
          { id: "journals", label: "Journal Entries", icon: FileText },
          { id: "ledger", label: "General Ledger", icon: FileSpreadsheet },
          { id: "trial-balance", label: "Trial Balance", icon: Calculator },
          { id: "periods", label: "Accounting Periods", icon: Calendar },
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
                <span className="text-sm font-medium text-muted-foreground">Chart of Accounts</span>
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {accounts.length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assets, Liabilities, Equity, Revenue, Expense
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Posted Journals</span>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {journals.filter((j) => j.status === "POSTED").length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Immutable double-entry audit records
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Draft Journals</span>
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {journals.filter((j) => j.status === "DRAFT").length.toString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting review and posting</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Trial Balance</span>
                <Scale className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-3 text-lg font-bold">
                {trialBalance?.isBalanced ? (
                  <span className="text-emerald-600 dark:text-emerald-400">BALANCED</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">UNBALANCED</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Debits: {trialBalance?.grandTotalDebit ?? "0"} | Credits:{" "}
                {trialBalance?.grandTotalCredit ?? "0"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                Financial Periods Overview
              </h2>
              <div className="mt-4 space-y-3">
                {periods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No accounting periods found.</p>
                ) : (
                  periods.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {p.startDate} to {p.endDate}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : p.status === "SOFT_CLOSED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Recent Journal Postings</h2>
              <div className="mt-4 space-y-3">
                {journals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No journal entries found.</p>
                ) : (
                  journals.slice(0, 3).map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <span className="font-semibold text-foreground">{j.entryNumber}</span>
                        <p className="text-xs text-muted-foreground">
                          {j.businessDate} • {j.description ?? "Manual Entry"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          ${j.totalDebit}
                        </span>
                        <span
                          className={`block text-[10px] font-bold uppercase ${
                            j.status === "POSTED" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {j.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Chart of Accounts */}
      {section === "accounts" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts by code, name, or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Account Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Subtype</th>
                    <th className="px-4 py-3">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No accounts match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{a.code}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              a.type === "ASSET"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : a.type === "LIABILITY"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : a.type === "EQUITY"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                    : a.type === "REVENUE"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {a.subtype ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {a.isControlAccount ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Account Form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              New Account
            </h2>
            <form onSubmit={(e) => void handleCreateAccount(e)} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Account Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6500"
                  value={newAccountCode}
                  onChange={(e) => setNewAccountCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advertising & Marketing"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Account Type *
                </label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="REVENUE">REVENUE</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or account description"
                  value={newAccountDesc}
                  onChange={(e) => setNewAccountDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION: Journal Entries */}
      {section === "journals" && (
        <div className="space-y-6">
          {/* Create Journal Entry Composer */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                New Balanced Journal Entry
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  isJournalBalanced
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {isJournalBalanced ? "BALANCED" : "UNBALANCED (Debits ≠ Credits)"}
              </span>
            </h2>

            <form onSubmit={(e) => void handleCreateJournal(e)} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Business Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly rent adjustment"
                    value={journalDesc}
                    onChange={(e) => setJournalDesc(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Line items table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 w-32">Debit ($)</th>
                      <th className="px-3 py-2 w-32">Credit ($)</th>
                      <th className="px-3 py-2">Line Memo</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {journalLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            required
                            value={line.accountId}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              const cur = updated[idx];
                              if (cur) cur.accountId = e.target.value;
                              setJournalLines(updated);
                            }}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                          >
                            <option value="">Select Account...</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              const cur = updated[idx];
                              if (cur) {
                                cur.debit = e.target.value;
                                if (parseFloat(e.target.value) > 0) cur.credit = "0";
                              }
                              setJournalLines(updated);
                            }}
                            className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              const cur = updated[idx];
                              if (cur) {
                                cur.credit = e.target.value;
                                if (parseFloat(e.target.value) > 0) cur.debit = "0";
                              }
                              setJournalLines(updated);
                            }}
                            className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Optional line memo"
                            value={line.description}
                            onChange={(e) => {
                              const updated = [...journalLines];
                              const cur = updated[idx];
                              if (cur) cur.description = e.target.value;
                              setJournalLines(updated);
                            }}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {journalLines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setJournalLines(journalLines.filter((_, i) => i !== idx));
                              }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/20 font-bold text-sm">
                    <tr>
                      <td className="px-3 py-2 text-right">Totals:</td>
                      <td className="px-3 py-2 font-mono text-emerald-600">
                        ${totalDebitSum.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-mono text-blue-600">
                        ${totalCreditSum.toFixed(2)}
                      </td>
                      <td
                        colSpan={2}
                        className="px-3 py-2 text-xs font-normal text-muted-foreground"
                      >
                        Difference: ${(totalDebitSum - totalCreditSum).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setJournalLines([
                      ...journalLines,
                      { accountId: "", debit: "0", credit: "0", description: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Line
                </button>

                <button
                  type="submit"
                  disabled={!isJournalBalanced || actionLoading}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? "Saving Draft..." : "Create Draft Entry"}
                </button>
              </div>
            </form>
          </div>

          {/* Journal Entries List */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Entry Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No journal entries found. Create one above to get started.
                    </td>
                  </tr>
                ) : (
                  journals.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {j.entryNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{j.businessDate}</td>
                      <td className="px-4 py-3 text-xs font-medium">{j.entryType}</td>
                      <td className="px-4 py-3 text-sm">{j.description ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold">${j.totalDebit}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            j.status === "POSTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : j.status === "DRAFT"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {j.status === "DRAFT" && (
                          <button
                            onClick={() => void handlePostJournal(j.id)}
                            disabled={actionLoading}
                            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Post to GL
                          </button>
                        )}
                        {j.status === "POSTED" && !j.reversedAt && (
                          <button
                            onClick={() => void handleReverseJournal(j.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" /> Reverse
                          </button>
                        )}
                        {j.reversedAt && (
                          <span className="text-xs text-muted-foreground italic">Reversed</span>
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

      {/* SECTION: General Ledger */}
      {section === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-foreground">
              Immutable General Ledger Postings
            </h2>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => void loadLedger(e.target.value || undefined)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Entry #</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Debit ($)</th>
                  <th className="px-4 py-3 text-right">Credit ($)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No posted transactions found in the general ledger.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row) => (
                    <tr key={row.lineId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.businessDate}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{row.entryNumber}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold">{row.accountCode}</span> -{" "}
                        {row.accountName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {row.description ?? row.entryDescription ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                        {parseFloat(row.debit) > 0 ? `$${row.debit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600 font-medium">
                        {parseFloat(row.credit) > 0 ? `$${row.credit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        ${row.runningBalance}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Trial Balance */}
      {section === "trial-balance" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Trial Balance Report</h2>
              <p className="text-xs text-muted-foreground">
                As of date: {trialBalance?.asOfDate ?? "Today"}
              </p>
            </div>
            <div
              className={`rounded-xl px-4 py-2 font-bold text-sm ${
                trialBalance?.isBalanced
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {trialBalance?.isBalanced ? "LEDGER BALANCED ✓" : "OUT OF BALANCE ✕"}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Account Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Debit ($)</th>
                  <th className="px-4 py-3 text-right">Credit ($)</th>
                  <th className="px-4 py-3 text-right">Net Debit ($)</th>
                  <th className="px-4 py-3 text-right">Net Credit ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!trialBalance || trialBalance.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No posted activity available to calculate trial balance.
                    </td>
                  </tr>
                ) : (
                  trialBalance.items.map((item) => (
                    <tr key={item.accountId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold">{item.accountCode}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.accountName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.accountType}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${item.totalDebit}</td>
                      <td className="px-4 py-3 text-right font-mono">${item.totalCredit}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                        {parseFloat(item.netDebit) > 0 ? `$${item.netDebit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">
                        {parseFloat(item.netCredit) > 0 ? `$${item.netCredit}` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {trialBalance && (
                <tfoot className="border-t-2 border-border bg-muted/20 font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right uppercase">
                      Grand Totals:
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${trialBalance.grandTotalDebit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${trialBalance.grandTotalCredit}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-center text-xs">
                      {trialBalance.isBalanced ? "Zero Difference ✓" : "Out of Balance!"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SECTION: Accounting Periods */}
      {section === "periods" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Fiscal & Accounting Periods</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Period Name</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No accounting periods defined.
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.startDate}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.endDate}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.status === "OPEN"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : p.status === "SOFT_CLOSED"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {p.status === "OPEN" && (
                            <button
                              onClick={() => void handleUpdatePeriodStatus(p.id, "SOFT_CLOSED")}
                              disabled={actionLoading}
                              className="rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400 disabled:opacity-50"
                            >
                              Soft Close
                            </button>
                          )}
                          {p.status !== "LOCKED" && (
                            <button
                              onClick={() => void handleUpdatePeriodStatus(p.id, "LOCKED")}
                              disabled={actionLoading}
                              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Lock Period
                            </button>
                          )}
                          {p.status === "LOCKED" && (
                            <button
                              onClick={() => void handleUpdatePeriodStatus(p.id, "OPEN")}
                              disabled={actionLoading}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              Re-open
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

          {/* Add Period Form */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              New Accounting Period
            </h2>
            <form onSubmit={(e) => void handleCreatePeriod(e)} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Period Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-Q2"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">End Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Period"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
