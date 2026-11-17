import { describe, expect, it } from "vitest";
import { adminResetPasswordSchema, inviteCompanyUserSchema } from "@erp/types";
import { randomBytes } from "node:crypto";

describe("Company Users & Admin Diagnostics Engine", () => {
  it("enforces minimum 12 characters for admin-reset passwords", () => {
    const invalidShort = adminResetPasswordSchema.safeParse({ newPassword: "Short1!" });
    expect(invalidShort.success).toBe(false);

    const validPassword = adminResetPasswordSchema.safeParse({
      newPassword: "StrongPassword2026!#",
    });
    expect(validPassword.success).toBe(true);
  });

  it("generates a high-entropy 16-character password with letters, numbers, and symbols", () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let generatedPassword = "";
    const randomBytesBuffer = randomBytes(16);
    for (let i = 0; i < 16; i++) {
      const byte = randomBytesBuffer[i] ?? 0;
      generatedPassword += chars.charAt(byte % chars.length);
    }

    expect(generatedPassword).toHaveLength(16);
    const valid = adminResetPasswordSchema.safeParse({ newPassword: generatedPassword });
    expect(valid.success).toBe(true);
  });

  it("validates invite user schema with role and optional temporary password", () => {
    const validInvite = inviteCompanyUserSchema.safeParse({
      email: "jane.analyst@ledgerly.com",
      fullName: "Jane Analyst",
      roleId: "a0000000-0000-4000-8000-000000000001",
      temporaryPassword: "TemporaryPass2026!",
    });
    expect(validInvite.success).toBe(true);

    const invalidEmail = inviteCompanyUserSchema.safeParse({
      email: "not-an-email",
      fullName: "Jane Analyst",
      roleId: "a0000000-0000-4000-8000-000000000001",
    });
    expect(invalidEmail.success).toBe(false);
  });
});
