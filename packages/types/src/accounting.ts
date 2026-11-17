import { z } from "zod";

const code = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

const name = z.string().trim().min(1).max(200);

const money = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,4})?$/);

const currency = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase());

export const accountTypeSchema = z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountSubtypeSchema = z.enum([
  "CURRENT_ASSET",
  "NON_CURRENT_ASSET",
  "CURRENT_LIABILITY",
  "NON_CURRENT_LIABILITY",
  "EQUITY",
  "OPERATING_REVENUE",
  "OTHER_REVENUE",
  "COST_OF_GOODS_SOLD",
  "OPERATING_EXPENSE",
  "TAX_EXPENSE",
  "OTHER_EXPENSE",
]);
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>;

export const accountInputSchema = z.object({
  code,
  name,
  type: accountTypeSchema,
  subtype: accountSubtypeSchema.optional(),
  currency: currency.default("USD"),
  description: z.string().trim().max(1000).optional(),
  parentAccountId: z.uuid().optional(),
  isControlAccount: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type AccountInput = z.infer<typeof accountInputSchema>;

export const accountingPeriodInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["OPEN", "SOFT_CLOSED", "LOCKED"]).default("OPEN"),
});
export type AccountingPeriodInput = z.infer<typeof accountingPeriodInputSchema>;

export const journalLineInputSchema = z.object({
  accountId: z.uuid(),
  debit: money.default("0"),
  credit: money.default("0"),
  currency: currency.default("USD"),
  exchangeRate: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,6})?$/)
    .default("1"),
  description: z.string().trim().max(500).optional(),
  partnerType: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE"]).optional(),
  partnerId: z.uuid().optional(),
  costCenter: z.string().trim().max(80).optional(),
  projectCode: z.string().trim().max(80).optional(),
});
export type JournalLineInput = z.infer<typeof journalLineInputSchema>;

export const journalEntryInputSchema = z.object({
  entryNumber: code.optional(),
  entryType: z
    .enum(["MANUAL", "SYSTEM", "INVENTORY", "PURCHASE", "SALES", "EXPENSE", "REVERSAL"])
    .default("MANUAL"),
  sourceModule: z.string().trim().max(80).optional(),
  sourceReferenceId: z.string().trim().max(120).optional(),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().max(2000).optional(),
  lines: z.array(journalLineInputSchema).min(2, "Journal entry must have at least 2 lines"),
});
export type JournalEntryInput = z.infer<typeof journalEntryInputSchema>;

export const journalActionSchema = z.object({
  action: z.enum(["POST", "REVERSE"]),
  reason: z.string().trim().max(1000).optional(),
});
export type JournalActionInput = z.infer<typeof journalActionSchema>;
