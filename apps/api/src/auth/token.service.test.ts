import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service.js";

const config = new ConfigService({
  JWT_ACCESS_SECRET: "01234567890123456789012345678901",
  ACCESS_TOKEN_TTL_SECONDS: 900,
});

describe("TokenService", () => {
  const service = new TokenService(new JwtService(), config);

  it("stores only a one-way digest for opaque refresh credentials", () => {
    const issued = service.issueOpaqueToken("11111111-1111-4111-8111-111111111111");
    expect(issued.raw).not.toBe(issued.hash);
    expect(issued.hash).toHaveLength(64);
    expect(service.matches(issued.raw, issued.hash)).toBe(true);
    expect(service.matches(`${issued.raw}x`, issued.hash)).toBe(false);
  });

  it("signs and verifies minimal access claims", async () => {
    const token = await service.signAccessToken({
      sub: "user-1",
      sid: "session-1",
      companyId: "company-1",
      platformRole: "NONE",
    });
    await expect(service.verifyAccessToken(token)).resolves.toMatchObject({
      sub: "user-1",
      sid: "session-1",
      companyId: "company-1",
    });
  });
});
