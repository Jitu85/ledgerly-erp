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
import { accounts, journalEntries } from "./accounting-schema.js";

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

export const expenseCategories = pgTable(
  "expense_categories",
  {
    ...base(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    policyLimit: money("policy_limit"),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    unique("expense_categories_company_id_id_uq").on(t.companyId, t.id),
    unique("expense_categories_company_code_uq").on(t.companyId, t.code),
    index("expense_categories_company_active_idx").on(t.companyId, t.isActive),
  ],
);

export const expenseClaims = pgTable(
  "expense_claims",
  {
    ...base(),
    claimNumber: text("claim_number").notNull(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    currency: text("currency").default("USD").notNull(),
    totalAmount: money("total_amount").default("0").notNull(),
    totalTaxAmount: money("total_tax_amount").default("0").notNull(),
    submissionDate: date("submission_date"),
    status: text("status").default("DRAFT").notNull(),
    notes: text("notes"),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    unique("expense_claims_company_id_id_uq").on(t.companyId, t.id),
    unique("expense_claims_company_claim_number_uq").on(t.companyId, t.claimNumber),
    index("expense_claims_company_employee_idx").on(t.companyId, t.employeeId),
    index("expense_claims_company_status_idx").on(t.companyId, t.status),
  ],
);

export const expenseLines = pgTable(
  "expense_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    expenseClaimId: uuid("expense_claim_id")
      .notNull()
      .references(() => expenseClaims.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    expenseDate: date("expense_date").notNull(),
    amount: money("amount").notNull(),
    taxAmount: money("tax_amount").default("0").notNull(),
    description: text("description").notNull(),
    merchant: text("merchant"),
    receiptUrl: text("receipt_url"),
    costCenter: text("cost_center"),
  },
  (t) => [
    unique("expense_lines_company_id_id_uq").on(t.companyId, t.id),
    index("expense_lines_claim_idx").on(t.expenseClaimId),
  ],
);
