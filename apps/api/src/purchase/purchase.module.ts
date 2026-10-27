import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { InventoryModule } from "../inventory/inventory.module.js";
import { PurchaseController } from "./purchase.controller.js";
import { PurchaseService } from "./purchase.service.js";
@Module({
  imports: [AuthModule, AuthorizationModule, InventoryModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
