import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as schema from "@erp/database/schema";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

type Database = PostgresJsDatabase<typeof schema>;
type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly platformClient;
  private readonly tenantClient;
  readonly platform: Database;
  private readonly tenant: Database;

  constructor(config: ConfigService) {
    this.platformClient = postgres(config.getOrThrow<string>("PLATFORM_DATABASE_URL"), { max: 10 });
    this.tenantClient = postgres(config.getOrThrow<string>("TENANT_DATABASE_URL"), { max: 20 });
    this.platform = drizzle(this.platformClient, { schema });
    this.tenant = drizzle(this.tenantClient, { schema });
  }

  async withTenant<T>(
    companyId: string,
    operation: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    return this.tenant.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_company_id', ${companyId}, true)`);
      return operation(tx);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.platformClient.end(), this.tenantClient.end()]);
  }
}
