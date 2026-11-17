import { describe, expect, it } from "vitest";
import { buildHeaders, safeReturnPath } from "./api";

describe("safeReturnPath", () => {
  it("accepts local paths and rejects external redirects", () => {
    expect(safeReturnPath("/profile")).toBe("/profile");
    expect(safeReturnPath("//attacker.example")).toBe("/dashboard");
    expect(safeReturnPath("https://attacker.example")).toBe("/dashboard");
    expect(safeReturnPath(null)).toBe("/dashboard");
  });
});

describe("buildHeaders", () => {
  it("defaults to application/json", () => {
    const headers = buildHeaders();
    expect(headers["content-type"]).toBe("application/json");
  });

  it("merges existing headers", () => {
    const headers = buildHeaders({ authorization: "Bearer test" });
    expect(headers["content-type"]).toBe("application/json");
    expect(headers.authorization).toBe("Bearer test");
  });
});
