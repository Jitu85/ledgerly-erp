import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type NeonAuthStatus = {
  isConfigured: boolean;
  baseUrl?: string | undefined;
  jwksUrl?: string | undefined;
  jwksReachable: boolean;
  keysCount?: number | undefined;
  error?: string | undefined;
};

@Injectable()
export class NeonAuthService {
  private readonly logger = new Logger(NeonAuthService.name);
  readonly baseUrl: string | undefined;
  readonly jwksUrl: string | undefined;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>("NEON_AUTH_BASE_URL");
    this.jwksUrl = this.config.get<string>("NEON_AUTH_JWKS_URL");
    this.isConfigured = Boolean(this.baseUrl && this.jwksUrl);

    if (this.isConfigured) {
      this.logger.log(`Neon Auth service configured with base: ${this.baseUrl ?? ""}`);
    } else {
      this.logger.warn("Neon Auth variables not set; managed auth integration disabled");
    }
  }

  async verifyJwks(): Promise<NeonAuthStatus> {
    if (!this.jwksUrl || !this.baseUrl) {
      return {
        isConfigured: false,
        jwksReachable: false,
        error: "Neon Auth JWKS URL is not configured",
      };
    }

    try {
      const response = await fetch(this.jwksUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return {
          isConfigured: true,
          baseUrl: this.baseUrl,
          jwksUrl: this.jwksUrl,
          jwksReachable: false,
          error: `JWKS endpoint responded with status ${response.status.toString()}`,
        };
      }

      const body = (await response.json()) as { keys?: unknown[] };
      const keysCount = Array.isArray(body.keys) ? body.keys.length : 0;

      return {
        isConfigured: true,
        baseUrl: this.baseUrl,
        jwksUrl: this.jwksUrl,
        jwksReachable: true,
        keysCount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isConfigured: true,
        baseUrl: this.baseUrl,
        jwksUrl: this.jwksUrl,
        jwksReachable: false,
        error: message,
      };
    }
  }
}
