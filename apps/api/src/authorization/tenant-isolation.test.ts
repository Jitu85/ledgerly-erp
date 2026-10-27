import { describe, expect, it } from "vitest";

function assertTenant(resourceCompanyId: string, activeCompanyId: string): boolean {
  return resourceCompanyId === activeCompanyId;
}

describe("tenant isolation invariant", () => {
  it("rejects another company's identifier", () => {
    expect(assertTenant("company-a", "company-a")).toBe(true);
    expect(assertTenant("company-b", "company-a")).toBe(false);
  });
});
