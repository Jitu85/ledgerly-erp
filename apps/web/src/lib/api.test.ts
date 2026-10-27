import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./api";

describe("safeReturnPath", () => {
  it("accepts local paths and rejects external redirects", () => {
    expect(safeReturnPath("/profile")).toBe("/profile");
    expect(safeReturnPath("//attacker.example")).toBe("/dashboard");
    expect(safeReturnPath("https://attacker.example")).toBe("/dashboard");
  });
});
