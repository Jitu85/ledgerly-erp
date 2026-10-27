import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { InventoryModule } from "../inventory/inventory.module.js";
import { SalesController } from "./sales.controller.js";
import { SalesService } from "./sales.service.js";
@Module({
  imports: [AuthModule, AuthorizationModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
