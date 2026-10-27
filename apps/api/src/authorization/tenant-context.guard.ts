import { and, eq, isNull } from "drizzle-orm";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { companies, companyUsers } from "@erp/database/schema";
import { DatabaseService } from "../database/database.service.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const companyId = request.auth.companyId;
    const requestedCompany = request.headers["x-company-id"];
    if (!companyId || (requestedCompany && requestedCompany !== companyId))
      throw new ForbiddenException({
        code: "TENANT_CONTEXT_INVALID",
        message: "Active company context is invalid",
      });
    const [membership] = await this.database.platform
      .select({ id: companyUsers.id, roleId: companyUsers.roleId })
      .from(companyUsers)
      .innerJoin(companies, eq(companies.id, companyUsers.companyId))
      .where(
        and(
          eq(companyUsers.userId, request.auth.sub),
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.status, "ACTIVE"),
          isNull(companyUsers.deletedAt),
          isNull(companies.deletedAt),
        ),
      )
      .limit(1);
    if (!membership)
      throw new ForbiddenException({
        code: "TENANT_CONTEXT_INVALID",
        message: "Active company context is invalid",
      });
    request.tenant = { companyId, membershipId: membership.id, roleId: membership.roleId };
    return true;
  }
}
