import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type NeonFunctionsStatus = {
  isConfigured: boolean;
  helloBaseUrl?: string | undefined;
  helloResponding: boolean;
  responsePreview?: string | undefined;
  statusCode?: number | undefined;
  error?: string | undefined;
};

@Injectable()
export class NeonFunctionsService {
  private readonly logger = new Logger(NeonFunctionsService.name);
  readonly helloBaseUrl: string | undefined;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.helloBaseUrl = this.config.get<string>("NEON_FUNCTION_HELLO_BASE_URL");
    this.isConfigured = Boolean(this.helloBaseUrl);

    if (this.isConfigured) {
      this.logger.log(
        `Neon Functions service configured for hello endpoint: ${this.helloBaseUrl ?? ""}`,
      );
    } else {
      this.logger.warn("NEON_FUNCTION_HELLO_BASE_URL not configured");
    }
  }

  async invokeHello(): Promise<NeonFunctionsStatus> {
    if (!this.helloBaseUrl) {
      return {
        isConfigured: false,
        helloResponding: false,
        error: "NEON_FUNCTION_HELLO_BASE_URL is not configured",
      };
    }

    try {
      const response = await fetch(this.helloBaseUrl, {
        method: "GET",
      });

      const text = await response.text();

      return {
        isConfigured: true,
        helloBaseUrl: this.helloBaseUrl,
        helloResponding: response.ok,
        statusCode: response.status,
        responsePreview: text.slice(0, 100),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isConfigured: true,
        helloBaseUrl: this.helloBaseUrl,
        helloResponding: false,
        error: message,
      };
    }
  }
}
