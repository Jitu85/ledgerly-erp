import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  replySupportMessageSchema,
  sendSupportMessageSchema,
  updateSupportMessageStatusSchema,
  type ReplySupportMessageInput,
  type SendSupportMessageInput,
  type UpdateSupportMessageStatusInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import { requestMetadata, type AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SupportService } from "./support.service.js";

function tenantCompanyId(request: AuthenticatedRequest): string {
  if (!request.tenant)
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  return request.tenant.companyId;
}

@Controller("support")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post("messages")
  async sendMessage(
    @Body(new ZodValidationPipe(sendSupportMessageSchema)) input: SendSupportMessageInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.support.sendMessage(
      tenantCompanyId(request),
      request.auth.sub,
      input,
      requestMetadata(request),
    );
  }

  @Get("my-messages")
  async getMyMessages(@Req() request: AuthenticatedRequest) {
    return this.support.listMessages(tenantCompanyId(request), request.auth.sub, false);
  }

  @Get("admin/messages")
  @RequirePermissions("company.users.manage")
  async getAdminMessages(
    @Req() request: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("category") category?: string,
  ) {
    return this.support.listMessages(tenantCompanyId(request), request.auth.sub, true, {
      status,
      category,
    });
  }

  @Get("unread-count")
  async getUnreadCount(@Req() request: AuthenticatedRequest, @Query("admin") adminParam?: string) {
    const isAdmin = adminParam === "true";
    return this.support.getUnreadCount(tenantCompanyId(request), request.auth.sub, isAdmin);
  }

  @Post("messages/:id/reply")
  @RequirePermissions("company.users.manage")
  async replyMessage(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(replySupportMessageSchema)) input: ReplySupportMessageInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.support.replyMessage(
      tenantCompanyId(request),
      id,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
  }

  @Patch("messages/:id/status")
  @RequirePermissions("company.users.manage")
  async updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSupportMessageStatusSchema))
    input: UpdateSupportMessageStatusInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.support.updateStatus(
      tenantCompanyId(request),
      id,
      input,
      request.auth.sub,
      requestMetadata(request),
    );
  }
}
