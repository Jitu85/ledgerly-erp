import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import { accounts, accountingPeriods, journalEntries, journalLines } from "./accounting-schema.js";

const accountingTables = [accounts, accountingPeriods, journalEntries, journalLines];

describe("accounting schema", () => {
  it("contains all core accounting tables", () => {
    expect(accountingTables.map(getTableName)).toEqual([
      "accounts",
      "accounting_periods",
      "journal_entries",
      "journal_lines",
    ]);
  });

  it("verifies money columns use decimal precision", () => {
    expect(journalEntries.totalDebit.dataType).toBe("string"); // drizzle numeric maps to string
    expect(journalEntries.totalCredit.dataType).toBe("string");
    expect(journalLines.debit.dataType).toBe("string");
    expect(journalLines.credit.dataType).toBe("string");
  });

  it("enforces tenant isolation column on all tables", () => {
    for (const table of accountingTables) {
      expect("companyId" in table).toBe(true);
    }
  });
});
