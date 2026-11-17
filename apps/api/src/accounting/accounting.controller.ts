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
import { z } from "zod";
import {
  accountInputSchema,
  accountingPeriodInputSchema,
  journalEntryInputSchema,
  type AccountInput,
  type AccountingPeriodInput,
  type JournalEntryInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AccountingService } from "./accounting.service.js";

const reverseSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

const periodStatusSchema = z.object({
  status: z.enum(["OPEN", "SOFT_CLOSED", "LOCKED"]),
});

function getTenantContext(r: AuthenticatedRequest) {
  if (!r.tenant) {
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  }
  return { companyId: r.tenant.companyId, userId: r.auth.sub };
}

@Controller("accounting")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ----------------------------------------------------
  // Chart of Accounts
  // ----------------------------------------------------
  @Get("accounts")
  @RequirePermissions("accounting.view")
  async listAccounts(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getAccounts(companyId, {
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("accounts/:id")
  @RequirePermissions("accounting.view")
  async getAccount(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getAccountById(companyId, id);
  }

  @Post("accounts")
  @RequirePermissions("accounting.accounts.manage")
  async createAccount(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(accountInputSchema)) body: AccountInput,
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.createAccount(companyId, userId, body);
  }

  // ----------------------------------------------------
  // Accounting Periods
  // ----------------------------------------------------
  @Get("periods")
  @RequirePermissions("accounting.view")
  async listPeriods(@Req() req: AuthenticatedRequest) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getPeriods(companyId);
  }

  @Post("periods")
  @RequirePermissions("accounting.periods.manage")
  async createPeriod(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(accountingPeriodInputSchema)) body: AccountingPeriodInput,
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.createPeriod(companyId, userId, body);
  }

  @Patch("periods/:id/status")
  @RequirePermissions("accounting.periods.manage")
  async updatePeriodStatus(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(periodStatusSchema))
    body: { status: "OPEN" | "SOFT_CLOSED" | "LOCKED" },
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.setPeriodStatus(companyId, userId, id, body.status);
  }

  // ----------------------------------------------------
  // Journal Entries
  // ----------------------------------------------------
  @Get("journal-entries")
  @RequirePermissions("accounting.view")
  async listJournalEntries(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
  ) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getJournalEntries(companyId, {
      status,
      fromDate,
      toDate,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("journal-entries/:id")
  @RequirePermissions("accounting.view")
  async getJournalEntry(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getJournalEntry(companyId, id);
  }

  @Post("journal-entries")
  @RequirePermissions("accounting.journals.create")
  async createJournalEntry(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(journalEntryInputSchema)) body: JournalEntryInput,
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.createJournalEntry(companyId, userId, body);
  }

  @Post("journal-entries/:id/post")
  @RequirePermissions("accounting.journals.post")
  async postJournalEntry(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.postJournalEntry(companyId, userId, id);
  }

  @Post("journal-entries/:id/reverse")
  @RequirePermissions("accounting.journals.reverse")
  async reverseJournalEntry(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reverseSchema)) body: { reason?: string },
  ) {
    const { companyId, userId } = getTenantContext(req);
    return this.accountingService.reverseJournalEntry(companyId, userId, id, body.reason);
  }

  // ----------------------------------------------------
  // General Ledger
  // ----------------------------------------------------
  @Get("general-ledger")
  @RequirePermissions("accounting.view")
  async getGeneralLedger(
    @Req() req: AuthenticatedRequest,
    @Query("accountId") accountId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getGeneralLedger(companyId, { accountId, fromDate, toDate });
  }

  // ----------------------------------------------------
  // Trial Balance
  // ----------------------------------------------------
  @Get("trial-balance")
  @RequirePermissions("accounting.reports.view")
  async getTrialBalance(@Req() req: AuthenticatedRequest, @Query("asOfDate") asOfDate?: string) {
    const { companyId } = getTenantContext(req);
    return this.accountingService.getTrialBalance(companyId, asOfDate);
  }
}
