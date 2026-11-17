import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  expenseCategoryInputSchema,
  expenseClaimInputSchema,
  type ExpenseCategoryInput,
  type ExpenseClaimInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { ExpensesService } from "./expenses.service.js";

const rejectSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

function getTenantContext(r: AuthenticatedRequest) {
  if (!r.tenant) {
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  }
  return {
    companyId: r.tenant.companyId,
    userId: r.auth.sub,
  };
}

@Controller("expenses")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ----------------------------------------------------
  // Categories
  // ----------------------------------------------------
  @Get("categories")
  @RequirePermissions("expense.claims.view")
  async listCategories(@Req() req: AuthenticatedRequest) {
    const { companyId } = getTenantContext(req);
    return this.expensesService.getCategories(companyId);
  }

  @Post("categories")
  @RequirePermissions("expense.categories.manage")
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(expenseCategoryInputSchema)) body: ExpenseCategoryInput,
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.createCategory(companyId, userId, body);
  }

  // ----------------------------------------------------
  // Claims
  // ----------------------------------------------------
  @Get("claims")
  @RequirePermissions("expense.claims.view")
  async listClaims(@Req() req: AuthenticatedRequest, @Query("employeeId") employeeId?: string) {
    const { companyId } = getTenantContext(req);
    return this.expensesService.getClaims(companyId, { employeeId });
  }

  @Get("claims/:id")
  @RequirePermissions("expense.claims.view")
  async getClaim(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId } = getTenantContext(req);
    return this.expensesService.getClaim(companyId, id);
  }

  @Post("claims")
  @RequirePermissions("expense.claims.create")
  async createClaim(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(expenseClaimInputSchema)) body: ExpenseClaimInput,
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.createClaim(companyId, userId, body);
  }

  @Post("claims/:id/submit")
  @RequirePermissions("expense.claims.create")
  async submitClaim(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.submitClaim(companyId, userId, id);
  }

  @Post("claims/:id/approve")
  @RequirePermissions("expense.claims.approve")
  async approveClaim(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.approveClaim(companyId, userId, id);
  }

  @Post("claims/:id/reject")
  @RequirePermissions("expense.claims.approve")
  async rejectClaim(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: { reason?: string },
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.rejectClaim(companyId, userId, id, body.reason);
  }

  @Post("claims/:id/post-to-gl")
  @RequirePermissions("expense.claims.post")
  async postClaimToGL(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId, userId } = getTenantContext(req);
    return this.expensesService.postClaimToGL(companyId, userId, id);
  }
}
