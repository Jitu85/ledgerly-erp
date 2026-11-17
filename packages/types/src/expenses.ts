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

export const expenseCategoryInputSchema = z.object({
  code,
  name,
  description: z.string().trim().max(1000).optional(),
  accountId: z.uuid().optional(),
  policyLimit: money.optional(),
  isActive: z.boolean().default(true),
});
export type ExpenseCategoryInput = z.infer<typeof expenseCategoryInputSchema>;

export const expenseLineInputSchema = z.object({
  categoryId: z.uuid(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: money,
  taxAmount: money.default("0"),
  description: z.string().trim().min(1).max(500),
  merchant: z.string().trim().max(200).optional(),
  receiptUrl: z.string().trim().max(2000).optional(),
  costCenter: z.string().trim().max(80).optional(),
});
export type ExpenseLineInput = z.infer<typeof expenseLineInputSchema>;

export const expenseClaimInputSchema = z.object({
  claimNumber: code.optional(),
  title: name,
  currency: currency.default("USD"),
  submissionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(expenseLineInputSchema).min(1, "Claim must have at least 1 line item"),
});
export type ExpenseClaimInput = z.infer<typeof expenseClaimInputSchema>;

export const expenseClaimActionSchema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "POST_TO_GL"]),
  reason: z.string().trim().max(1000).optional(),
});
export type ExpenseClaimActionInput = z.infer<typeof expenseClaimActionSchema>;
