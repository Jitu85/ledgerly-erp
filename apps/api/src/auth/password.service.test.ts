import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes with Argon2id and verifies the original password", async () => {
    const hash = await service.hash("a-long-and-unique-password");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(hash, "a-long-and-unique-password")).resolves.toBe(true);
    await expect(service.verify(hash, "wrong-password")).resolves.toBe(false);
    expect(hash).not.toContain("a-long-and-unique-password");
  });
});
