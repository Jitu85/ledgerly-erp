import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CsrfGuard } from "./auth/csrf.guard.js";
import { CompanyUsersModule } from "./company-users/company-users.module.js";
import { validateEnvironment } from "./config/environment.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { InventoryModule } from "./inventory/inventory.module.js";
import { NeonModule } from "./neon/neon.module.js";
import { PurchaseModule } from "./purchase/purchase.module.js";
import { SalesModule } from "./sales/sales.module.js";
import { AccountingModule } from "./accounting/accounting.module.js";
import { ExpensesModule } from "./expenses/expenses.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env", "../../.env.local", "../../.env"],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    NeonModule,
    AuditModule,
    AuthModule,
    CompanyUsersModule,
    HealthModule,
    InventoryModule,
    PurchaseModule,
    SalesModule,
    AccountingModule,
    ExpensesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
