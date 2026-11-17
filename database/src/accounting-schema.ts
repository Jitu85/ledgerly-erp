import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { companies, users } from "./schema.js";

const money = (n: string) => numeric(n, { precision: 20, scale: 4 });

const base = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const accounts = pgTable(
  "accounts",
  {
    ...base(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    subtype: text("subtype"),
    currency: text("currency").default("USD").notNull(),
    description: text("description"),
    parentAccountId: uuid("parent_account_id"),
    isControlAccount: boolean("is_control_account").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    unique("accounts_company_id_id_uq").on(t.companyId, t.id),
    unique("accounts_company_code_uq").on(t.companyId, t.code),
    index("accounts_company_type_idx").on(t.companyId, t.type),
    index("accounts_company_active_idx").on(t.companyId, t.isActive),
  ],
);

export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    ...base(),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").default("OPEN").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("accounting_periods_company_id_id_uq").on(t.companyId, t.id),
    unique("accounting_periods_company_name_uq").on(t.companyId, t.name),
    index("accounting_periods_company_dates_idx").on(t.companyId, t.startDate, t.endDate),
  ],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    ...base(),
    entryNumber: text("entry_number").notNull(),
    entryType: text("entry_type").default("MANUAL").notNull(),
    sourceModule: text("source_module"),
    sourceReferenceId: text("source_reference_id"),
    businessDate: date("business_date").notNull(),
    status: text("status").default("DRAFT").notNull(),
    isBalanced: boolean("is_balanced").default(true).notNull(),
    totalDebit: money("total_debit").default("0").notNull(),
    totalCredit: money("total_credit").default("0").notNull(),
    description: text("description"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversalOfId: uuid("reversal_of_id"),
    reversalReason: text("reversal_reason"),
  },
  (t) => [
    unique("journal_entries_company_id_id_uq").on(t.companyId, t.id),
    unique("journal_entries_company_entry_number_uq").on(t.companyId, t.entryNumber),
    index("journal_entries_company_date_idx").on(t.companyId, t.businessDate),
    index("journal_entries_company_status_idx").on(t.companyId, t.status),
  ],
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    debit: money("debit").default("0").notNull(),
    credit: money("credit").default("0").notNull(),
    currency: text("currency").default("USD").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6 }).default("1").notNull(),
    baseDebit: money("base_debit").default("0").notNull(),
    baseCredit: money("base_credit").default("0").notNull(),
    description: text("description"),
    partnerType: text("partner_type"),
    partnerId: uuid("partner_id"),
    costCenter: text("cost_center"),
    projectCode: text("project_code"),
  },
  (t) => [
    unique("journal_lines_company_id_id_uq").on(t.companyId, t.id),
    index("journal_lines_company_account_idx").on(t.companyId, t.accountId),
    index("journal_lines_entry_idx").on(t.journalEntryId),
  ],
);
