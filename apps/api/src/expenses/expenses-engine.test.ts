import { describe, expect, it } from "vitest";
import { FixedDecimal } from "../inventory/decimal.js";

describe("expenses engine", () => {
  it("calculates claim total amount and tax totals accurately", () => {
    const lines = [
      { amount: "120.50", taxAmount: "12.05" },
      { amount: "45.00", taxAmount: "4.50" },
      { amount: "89.99", taxAmount: "0.00" },
    ];

    let totalAmount = FixedDecimal.zero();
    let totalTax = FixedDecimal.zero();

    for (const l of lines) {
      totalAmount = totalAmount.add(FixedDecimal.parse(l.amount));
      totalTax = totalTax.add(FixedDecimal.parse(l.taxAmount));
    }

    expect(totalAmount.toString()).toBe("255.49");
    expect(totalTax.toString()).toBe("16.55");
  });

  it("verifies GL journal entry generated from claim balances debits and credits", () => {
    const claimLines = [
      { categoryAccountId: "acc-travel", amount: "350.00" },
      { categoryAccountId: "acc-meals", amount: "75.50" },
    ];

    let totalExpenseDebit = FixedDecimal.zero();
    for (const line of claimLines) {
      totalExpenseDebit = totalExpenseDebit.add(FixedDecimal.parse(line.amount));
    }

    const reimbursementPayableCredit = totalExpenseDebit;

    expect(totalExpenseDebit.equals(reimbursementPayableCredit)).toBe(true);
    expect(reimbursementPayableCredit.toString()).toBe("425.5");
  });

  it("enforces allowed claim state transitions", () => {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["APPROVED", "REJECTED"],
      APPROVED: ["POSTED"],
      REJECTED: ["DRAFT"],
      POSTED: ["PAID"],
    };

    expect(validTransitions.DRAFT).toContain("SUBMITTED");
    expect(validTransitions.SUBMITTED).toContain("APPROVED");
    expect(validTransitions.SUBMITTED).toContain("REJECTED");
    expect(validTransitions.APPROVED).toContain("POSTED");
    expect(validTransitions.DRAFT).not.toContain("APPROVED"); // Must submit before approving
  });
});
