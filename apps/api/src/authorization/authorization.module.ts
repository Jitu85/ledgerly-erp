import { Module } from "@nestjs/common";
import { PermissionGuard } from "./permission.guard.js";
import { TenantContextGuard } from "./tenant-context.guard.js";

@Module({
  providers: [PermissionGuard, TenantContextGuard],
  exports: [PermissionGuard, TenantContextGuard],
})
export class AuthorizationModule {}
