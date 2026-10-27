import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  changeMembershipRoleSchema,
  changeMembershipStatusSchema,
  type ChangeMembershipRoleInput,
  type ChangeMembershipStatusInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import { requestMetadata, type AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CompanyUsersService } from "./company-users.service.js";

function tenantCompanyId(request: AuthenticatedRequest): string {
  if (!request.tenant)
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  return request.tenant.companyId;
}

@Controller("company-users")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class CompanyUsersController {
  constructor(private readonly companyUsers: CompanyUsersService) {}

  @Get()
  @RequirePermissions("company.users.view")
  list(@Req() request: AuthenticatedRequest) {
    return this.companyUsers.list(tenantCompanyId(request));
  }

  @Patch(":membershipId/role")
  @RequirePermissions("company.users.manage")
  async changeRole(
    @Param("membershipId") membershipId: string,
    @Body(new ZodValidationPipe(changeMembershipRoleSchema)) input: ChangeMembershipRoleInput,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ status: "updated" }> {
    await this.companyUsers.changeRole(
      tenantCompanyId(request),
      membershipId,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
    return { status: "updated" };
  }

  @Patch(":membershipId/status")
  @RequirePermissions("company.users.manage")
  async changeStatus(
    @Param("membershipId") membershipId: string,
    @Body(new ZodValidationPipe(changeMembershipStatusSchema)) input: ChangeMembershipStatusInput,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ status: "updated" }> {
    await this.companyUsers.changeStatus(
      tenantCompanyId(request),
      membershipId,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
    return { status: "updated" };
  }
}
