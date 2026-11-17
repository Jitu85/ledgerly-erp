import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { NeonStorageService } from "./neon-storage.service.js";
import { NeonAuthService, type NeonAuthStatus } from "./neon-auth.service.js";
import { NeonRealtimeService, type NeonRealtimeStatus } from "./neon-realtime.service.js";
import { NeonFunctionsService, type NeonFunctionsStatus } from "./neon-functions.service.js";
import { sql } from "drizzle-orm";

export type NeonServicesReport = {
  timestamp: string;
  postgres: {
    connected: boolean;
    serverVersion?: string | undefined;
    permissionsCount?: number | undefined;
    error?: string | undefined;
  };
  objectStorage: {
    configured: boolean;
    bucket: string;
    bucketAccessible: boolean;
    testObjectWrittenAndVerified: boolean;
    error?: string | undefined;
  };
  auth: NeonAuthStatus;
  realtime: NeonRealtimeStatus;
  functions: NeonFunctionsStatus;
  summary: {
    allOperational: boolean;
    note: string;
  };
};

@Injectable()
export class NeonService {
  private readonly logger = new Logger(NeonService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: NeonStorageService,
    private readonly authService: NeonAuthService,
    private readonly realtimeService: NeonRealtimeService,
    private readonly functionsService: NeonFunctionsService,
  ) {}

  async testAllServices(): Promise<NeonServicesReport> {
    const timestamp = new Date().toISOString();

    // 1. Postgres Database Verification
    let postgresStatus: NeonServicesReport["postgres"] = { connected: false };
    try {
      const versionResult = await this.databaseService.platform.execute(sql`SELECT version()`);
      const countResult = await this.databaseService.platform.execute(
        sql`SELECT count(*)::int as count FROM permissions`,
      );
      const row = versionResult[0] as { version?: string } | undefined;
      const countRow = countResult[0] as { count?: number } | undefined;

      postgresStatus = {
        connected: true,
        serverVersion: row?.version,
        permissionsCount: countRow?.count,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Neon Postgres check failed: ${message}`);
      postgresStatus = { connected: false, error: message };
    }

    // 2. Object Storage Verification (End-to-End Put, Get, Delete)
    const storageStatus: NeonServicesReport["objectStorage"] = {
      configured: this.storageService.isConfigured,
      bucket: this.storageService.bucketName,
      bucketAccessible: false,
      testObjectWrittenAndVerified: false,
    };

    if (this.storageService.isConfigured) {
      try {
        const bucketCheck = await this.storageService.checkBucket();
        storageStatus.bucketAccessible = bucketCheck.status === "connected";

        const testKey = `test/neon-health-${Date.now().toString()}.txt`;
        const testContent = `Neon Object Storage Health Check - ${timestamp}`;

        await this.storageService.putObject(testKey, testContent, "text/plain");
        const retrieved = await this.storageService.getObject(testKey);

        if (retrieved === testContent) {
          storageStatus.testObjectWrittenAndVerified = true;
        }

        // Clean up test object
        await this.storageService.deleteObject(testKey);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Neon Object Storage check failed: ${message}`);
        storageStatus.error = message;
      }
    }

    // 3. Auth JWKS Verification
    const authStatus = await this.authService.verifyJwks();

    // 4. Realtime Endpoint Verification
    const realtimeStatus = await this.realtimeService.verifyEndpoint();

    // 5. Functions Hello Endpoint Verification
    const functionsStatus = await this.functionsService.invokeHello();

    const allOperational =
      postgresStatus.connected &&
      storageStatus.bucketAccessible &&
      storageStatus.testObjectWrittenAndVerified &&
      authStatus.jwksReachable &&
      realtimeStatus.reachable &&
      functionsStatus.helloResponding;

    return {
      timestamp,
      postgres: postgresStatus,
      objectStorage: storageStatus,
      auth: authStatus,
      realtime: realtimeStatus,
      functions: functionsStatus,
      summary: {
        allOperational,
        note: allOperational
          ? "All wired Neon services (Postgres, Storage, Auth, Realtime, Functions) are fully operational end to end."
          : "One or more Neon services failed the end-to-end check.",
      },
    };
  }
}
