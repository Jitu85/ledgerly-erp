import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  adminResetPasswordSchema,
  adminUpdateUserSchema,
  changeMembershipRoleSchema,
  changeMembershipStatusSchema,
  inviteCompanyUserSchema,
  type AdminResetPasswordInput,
  type AdminUpdateUserInput,
  type ChangeMembershipRoleInput,
  type ChangeMembershipStatusInput,
  type InviteCompanyUserInput,
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

  @Get("roles")
  @RequirePermissions("company.users.view")
  getRoles(@Req() request: AuthenticatedRequest) {
    return this.companyUsers.getRoles(tenantCompanyId(request));
  }

  @Post("invite")
  @RequirePermissions("company.users.manage")
  async invite(
    @Body(new ZodValidationPipe(inviteCompanyUserSchema)) input: InviteCompanyUserInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companyUsers.inviteUser(
      tenantCompanyId(request),
      input,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Post(":membershipId/reset-password")
  @RequirePermissions("company.users.manage")
  async resetPassword(
    @Param("membershipId") membershipId: string,
    @Body(new ZodValidationPipe(adminResetPasswordSchema)) input: AdminResetPasswordInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companyUsers.adminResetPassword(
      tenantCompanyId(request),
      membershipId,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Post(":membershipId/generate-password")
  @RequirePermissions("company.users.manage")
  async generatePassword(
    @Param("membershipId") membershipId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companyUsers.generatePassword(
      tenantCompanyId(request),
      membershipId,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Post(":membershipId/unlock")
  @RequirePermissions("company.users.manage")
  async unlock(@Param("membershipId") membershipId: string, @Req() request: AuthenticatedRequest) {
    return this.companyUsers.unlockUser(
      tenantCompanyId(request),
      membershipId,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Post(":membershipId/create-reset-link")
  @RequirePermissions("company.users.manage")
  async createResetLink(
    @Param("membershipId") membershipId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companyUsers.createResetLink(
      tenantCompanyId(request),
      membershipId,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Patch(":membershipId/details")
  @RequirePermissions("company.users.manage")
  async updateDetails(
    @Param("membershipId") membershipId: string,
    @Body(new ZodValidationPipe(adminUpdateUserSchema)) input: AdminUpdateUserInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companyUsers.updateDetails(
      tenantCompanyId(request),
      membershipId,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
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
