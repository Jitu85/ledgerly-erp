import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export type AccessClaims = {
  sub: string;
  sid: string;
  companyId?: string;
  platformRole: "NONE" | "SUPER_ADMIN";
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  issueOpaqueToken(id: string): { raw: string; hash: string } {
    const raw = `${id}.${randomBytes(32).toString("base64url")}`;
    return { raw, hash: this.hash(raw) };
  }

  hash(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  matches(raw: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(raw), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  getTokenId(raw: string): string | null {
    const separator = raw.indexOf(".");
    return separator > 0 ? raw.slice(0, separator) : null;
  }

  signAccessToken(claims: AccessClaims): Promise<string> {
    return this.jwt.signAsync(claims, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS"),
      issuer: "erp-api",
      audience: "erp-web",
    });
  }

  verifyAccessToken(raw: string): Promise<AccessClaims> {
    return this.jwt.verifyAsync<AccessClaims>(raw, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      issuer: "erp-api",
      audience: "erp-web",
    });
  }
}
