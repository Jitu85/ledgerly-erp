import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface NeonRealtimeStatus {
  isConfigured: boolean;
  realtimeUrl?: string | undefined;
  hasSecret: boolean;
  reachable: boolean;
  error?: string | undefined;
}

@Injectable()
export class NeonRealtimeService {
  private readonly logger = new Logger(NeonRealtimeService.name);
  readonly realtimeUrl: string | undefined;
  readonly secret: string | undefined;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    this.realtimeUrl = this.config.get<string>("NEON_REALTIME_URL");
    this.secret = this.config.get<string>("NEON_REALTIME_SECRET");
    this.isConfigured = Boolean(this.realtimeUrl && this.secret);

    if (this.isConfigured) {
      this.logger.log(`Neon Realtime configured for WebSocket: ${this.realtimeUrl}`);
    } else {
      this.logger.warn("Neon Realtime variables not set");
    }
  }

  async verifyEndpoint(): Promise<NeonRealtimeStatus> {
    if (!this.realtimeUrl) {
      return {
        isConfigured: false,
        hasSecret: Boolean(this.secret),
        reachable: false,
        error: "NEON_REALTIME_URL is not configured",
      };
    }

    try {
      // The realtime URL is a WebSocket endpoint (wss://...).
      // We can probe the HTTP equivalent (https://...) or check DNS/TCP reachability via fetch
      const httpUrl = this.realtimeUrl.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
      const response = await fetch(httpUrl, {
        method: "GET",
        headers: { Accept: "*/*" },
      });

      // Even a 400 or 404 or Upgrade Required from the WebSocket server proves the server is reachable and active
      return {
        isConfigured: true,
        realtimeUrl: this.realtimeUrl,
        hasSecret: Boolean(this.secret),
        reachable: response.status < 500,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isConfigured: true,
        realtimeUrl: this.realtimeUrl,
        hasSecret: Boolean(this.secret),
        reachable: false,
        error: message,
      };
    }
  }
}
