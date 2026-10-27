import { and, eq, inArray } from "drizzle-orm";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { permissions, rolePermissions } from "@erp/database/schema";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import { REQUIRED_PERMISSIONS } from "./require-permissions.decorator.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.tenant)
      throw new ForbiddenException({
        code: "TENANT_CONTEXT_INVALID",
        message: "Tenant context is required",
      });
    const rows = await this.database.platform
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(rolePermissions.companyId, request.tenant.companyId),
          eq(rolePermissions.roleId, request.tenant.roleId),
          inArray(permissions.code, required),
        ),
      );
    const granted = new Set(rows.map(({ code }) => code));
    if (!required.every((permission) => granted.has(permission)))
      throw new ForbiddenException({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action",
      });
    return true;
  }
}
