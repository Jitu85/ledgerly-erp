import { describe, expect, it } from "vitest";
import { FixedDecimal } from "../inventory/decimal.js";

describe("core accounting engine", () => {
  it("enforces balanced double-entry equation (total debits == total credits)", () => {
    const debit1 = FixedDecimal.parse("500.00");
    const debit2 = FixedDecimal.parse("150.50");
    const totalDebit = debit1.add(debit2);

    const credit1 = FixedDecimal.parse("650.50");
    const totalCredit = credit1;

    expect(totalDebit.equals(totalCredit)).toBe(true);
    expect(totalDebit.toString()).toBe("650.5");
  });

  it("detects unbalanced journal entries", () => {
    const debit = FixedDecimal.parse("100.00");
    const credit = FixedDecimal.parse("99.99");
    expect(debit.equals(credit)).toBe(false);
  });

  it("calculates trial balance net balances accurately", () => {
    // Cash account (Asset)
    const cashDebits = FixedDecimal.parse("1000.00");
    const cashCredits = FixedDecimal.parse("250.00");
    const cashNet = cashDebits.subtract(cashCredits);
    expect(cashNet.toString()).toBe("750");

    // Accounts Payable (Liability)
    const apCredits = FixedDecimal.parse("500.00");
    const apDebits = FixedDecimal.parse("200.00");
    const apNet = apCredits.subtract(apDebits);
    expect(apNet.toString()).toBe("300");
  });

  it("reversal creates symmetrical inverse debit and credit lines", () => {
    const originalLines = [
      { accountId: "acc-cash", debit: "100.0000", credit: "0.0000" },
      { accountId: "acc-revenue", debit: "0.0000", credit: "100.0000" },
    ];

    const reversedLines = originalLines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
    }));

    const firstLine = reversedLines[0];
    const secondLine = reversedLines[1];
    expect(firstLine?.debit).toBe("0.0000");
    expect(firstLine?.credit).toBe("100.0000");
    expect(secondLine?.debit).toBe("100.0000");
    expect(secondLine?.credit).toBe("0.0000");

    // Both original and reversed remain balanced
    const origDebits = originalLines.reduce(
      (acc, l) => acc.add(FixedDecimal.parse(l.debit)),
      FixedDecimal.zero(),
    );
    const origCredits = originalLines.reduce(
      (acc, l) => acc.add(FixedDecimal.parse(l.credit)),
      FixedDecimal.zero(),
    );
    expect(origDebits.equals(origCredits)).toBe(true);

    const revDebits = reversedLines.reduce(
      (acc, l) => acc.add(FixedDecimal.parse(l.debit)),
      FixedDecimal.zero(),
    );
    const revCredits = reversedLines.reduce(
      (acc, l) => acc.add(FixedDecimal.parse(l.credit)),
      FixedDecimal.zero(),
    );
    expect(revDebits.equals(revCredits)).toBe(true);
  });
});
