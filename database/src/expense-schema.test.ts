import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import { expenseCategories, expenseClaims, expenseLines } from "./expense-schema.js";

const expenseTables = [expenseCategories, expenseClaims, expenseLines];

describe("expense schema", () => {
  it("contains all core expense tables", () => {
    expect(expenseTables.map(getTableName)).toEqual([
      "expense_categories",
      "expense_claims",
      "expense_lines",
    ]);
  });

  it("verifies monetary columns are numeric", () => {
    expect(expenseClaims.totalAmount.dataType).toBe("string");
    expect(expenseLines.amount.dataType).toBe("string");
  });

  it("enforces tenant isolation column on all tables", () => {
    for (const table of expenseTables) {
      expect("companyId" in table).toBe(true);
    }
  });
});
