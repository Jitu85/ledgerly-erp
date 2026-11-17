import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  accounts,
  expenseCategories,
  expenseClaims,
  expenseLines,
  users,
} from "@erp/database/schema";
import type { ExpenseCategoryInput, ExpenseClaimInput } from "@erp/types";
import { DatabaseService } from "../database/database.service.js";
import { FixedDecimal } from "../inventory/decimal.js";
import { AccountingService } from "../accounting/accounting.service.js";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accountingService: AccountingService,
  ) {}

  // ----------------------------------------------------
  // Categories
  // ----------------------------------------------------
  async getCategories(companyId: string) {
    return this.db.withTenant(companyId, async (tx) => {
      return tx
        .select({
          id: expenseCategories.id,
          code: expenseCategories.code,
          name: expenseCategories.name,
          description: expenseCategories.description,
          accountId: expenseCategories.accountId,
          accountCode: accounts.code,
          accountName: accounts.name,
          policyLimit: expenseCategories.policyLimit,
          isActive: expenseCategories.isActive,
          createdAt: expenseCategories.createdAt,
        })
        .from(expenseCategories)
        .leftJoin(accounts, eq(expenseCategories.accountId, accounts.id))
        .where(eq(expenseCategories.companyId, companyId))
        .orderBy(asc(expenseCategories.code));
    });
  }

  async createCategory(companyId: string, actorId: string, input: ExpenseCategoryInput) {
    return this.db.withTenant(companyId, async (tx) => {
      const [existing] = await tx
        .select({ id: expenseCategories.id })
        .from(expenseCategories)
        .where(
          and(eq(expenseCategories.companyId, companyId), eq(expenseCategories.code, input.code)),
        )
        .limit(1);
      if (existing) {
        throw new ConflictException(`Expense category ${input.code} already exists`);
      }

      const [created] = await tx
        .insert(expenseCategories)
        .values({
          companyId,
          code: input.code,
          name: input.name,
          description: input.description,
          accountId: input.accountId,
          policyLimit: input.policyLimit,
          isActive: input.isActive,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      return created;
    });
  }

  // ----------------------------------------------------
  // Claims
  // ----------------------------------------------------
  async getClaims(companyId: string, filter?: { employeeId?: string | undefined }) {
    return this.db.withTenant(companyId, async (tx) => {
      const conditions = [eq(expenseClaims.companyId, companyId)];
      if (filter?.employeeId) {
        conditions.push(eq(expenseClaims.employeeId, filter.employeeId));
      }

      return tx
        .select({
          id: expenseClaims.id,
          claimNumber: expenseClaims.claimNumber,
          employeeId: expenseClaims.employeeId,
          employeeName: users.fullName,
          employeeEmail: users.email,
          title: expenseClaims.title,
          currency: expenseClaims.currency,
          totalAmount: expenseClaims.totalAmount,
          totalTaxAmount: expenseClaims.totalTaxAmount,
          submissionDate: expenseClaims.submissionDate,
          status: expenseClaims.status,
          notes: expenseClaims.notes,
          approvedAt: expenseClaims.approvedAt,
          rejectionReason: expenseClaims.rejectionReason,
          journalEntryId: expenseClaims.journalEntryId,
          paidAt: expenseClaims.paidAt,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .innerJoin(users, eq(expenseClaims.employeeId, users.id))
        .where(and(...conditions))
        .orderBy(desc(expenseClaims.createdAt));
    });
  }

  async getClaim(companyId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [claim] = await tx
        .select({
          id: expenseClaims.id,
          claimNumber: expenseClaims.claimNumber,
          employeeId: expenseClaims.employeeId,
          employeeName: users.fullName,
          employeeEmail: users.email,
          title: expenseClaims.title,
          currency: expenseClaims.currency,
          totalAmount: expenseClaims.totalAmount,
          totalTaxAmount: expenseClaims.totalTaxAmount,
          submissionDate: expenseClaims.submissionDate,
          status: expenseClaims.status,
          notes: expenseClaims.notes,
          approvedAt: expenseClaims.approvedAt,
          rejectionReason: expenseClaims.rejectionReason,
          journalEntryId: expenseClaims.journalEntryId,
          paidAt: expenseClaims.paidAt,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .innerJoin(users, eq(expenseClaims.employeeId, users.id))
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .limit(1);

      if (!claim) throw new NotFoundException("Expense claim not found");

      const lines = await tx
        .select({
          id: expenseLines.id,
          lineNumber: expenseLines.lineNumber,
          categoryId: expenseLines.categoryId,
          categoryCode: expenseCategories.code,
          categoryName: expenseCategories.name,
          expenseDate: expenseLines.expenseDate,
          amount: expenseLines.amount,
          taxAmount: expenseLines.taxAmount,
          description: expenseLines.description,
          merchant: expenseLines.merchant,
          receiptUrl: expenseLines.receiptUrl,
          costCenter: expenseLines.costCenter,
        })
        .from(expenseLines)
        .innerJoin(expenseCategories, eq(expenseLines.categoryId, expenseCategories.id))
        .where(and(eq(expenseLines.companyId, companyId), eq(expenseLines.expenseClaimId, id)))
        .orderBy(asc(expenseLines.lineNumber));

      return { ...claim, lines };
    });
  }

  async createClaim(companyId: string, actorId: string, input: ExpenseClaimInput) {
    return this.db.withTenant(companyId, async (tx) => {
      if (input.lines.length === 0) {
        throw new BadRequestException("Expense claim must have at least one line item");
      }

      // Validate category IDs
      const categoryIds = [...new Set(input.lines.map((l) => l.categoryId))];
      const foundCategories = await tx
        .select({ id: expenseCategories.id, policyLimit: expenseCategories.policyLimit })
        .from(expenseCategories)
        .where(
          and(
            eq(expenseCategories.companyId, companyId),
            inArray(expenseCategories.id, categoryIds),
          ),
        );

      if (foundCategories.length !== categoryIds.length) {
        throw new BadRequestException("One or more selected expense categories do not exist");
      }

      // Calculate totals
      let totalAmount = FixedDecimal.zero();
      let totalTaxAmount = FixedDecimal.zero();

      for (const line of input.lines) {
        const amt = FixedDecimal.parse(line.amount);
        const tax = FixedDecimal.parse(line.taxAmount || "0");

        if (amt.isNegative() || amt.isZero()) {
          throw new BadRequestException("Line item amount must be positive");
        }
        if (tax.isNegative()) {
          throw new BadRequestException("Tax amount cannot be negative");
        }

        totalAmount = totalAmount.add(amt);
        totalTaxAmount = totalTaxAmount.add(tax);
      }

      let claimNumber = input.claimNumber;
      if (!claimNumber) {
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const rand = Math.floor(1000 + Math.random() * 9000).toString();
        claimNumber = `EXP-${datePrefix}-${rand}`;
      }

      const [header] = await tx
        .insert(expenseClaims)
        .values({
          companyId,
          claimNumber,
          employeeId: actorId,
          title: input.title,
          currency: input.currency || "USD",
          totalAmount: totalAmount.toString(),
          totalTaxAmount: totalTaxAmount.toString(),
          submissionDate: input.submissionDate ?? null,
          status: "DRAFT",
          notes: input.notes,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      if (!header) throw new BadRequestException("Failed to create expense claim");

      let lineNumber = 1;
      for (const line of input.lines) {
        await tx.insert(expenseLines).values({
          companyId,
          expenseClaimId: header.id,
          lineNumber: lineNumber++,
          categoryId: line.categoryId,
          expenseDate: line.expenseDate,
          amount: line.amount,
          taxAmount: line.taxAmount || "0",
          description: line.description,
          merchant: line.merchant,
          receiptUrl: line.receiptUrl,
          costCenter: line.costCenter,
        });
      }

      return this.getClaim(companyId, header.id);
    });
  }

  async submitClaim(companyId: string, actorId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [claim] = await tx
        .select()
        .from(expenseClaims)
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .limit(1);

      if (!claim) throw new NotFoundException("Expense claim not found");
      if (claim.status !== "DRAFT") {
        throw new BadRequestException(`Cannot submit claim in status ${claim.status}`);
      }

      const [updated] = await tx
        .update(expenseClaims)
        .set({
          status: "SUBMITTED",
          submissionDate: new Date().toISOString().slice(0, 10),
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .returning();

      return updated;
    });
  }

  async approveClaim(companyId: string, actorId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [claim] = await tx
        .select()
        .from(expenseClaims)
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .limit(1);

      if (!claim) throw new NotFoundException("Expense claim not found");
      if (claim.status !== "SUBMITTED") {
        throw new BadRequestException(`Cannot approve claim in status ${claim.status}`);
      }

      const [updated] = await tx
        .update(expenseClaims)
        .set({
          status: "APPROVED",
          approvedBy: actorId,
          approvedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .returning();

      return updated;
    });
  }

  async rejectClaim(companyId: string, actorId: string, id: string, reason?: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [claim] = await tx
        .select()
        .from(expenseClaims)
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .limit(1);

      if (!claim) throw new NotFoundException("Expense claim not found");
      if (claim.status !== "SUBMITTED") {
        throw new BadRequestException(`Cannot reject claim in status ${claim.status}`);
      }

      const [updated] = await tx
        .update(expenseClaims)
        .set({
          status: "REJECTED",
          rejectionReason: reason ?? "Rejected by approver",
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)))
        .returning();

      return updated;
    });
  }

  async postClaimToGL(companyId: string, actorId: string, id: string) {
    // 1. Fetch claim and lines
    const claim = await this.getClaim(companyId, id);
    if (claim.status !== "APPROVED") {
      throw new BadRequestException(
        `Only APPROVED claims can be posted to accounting. Status is ${claim.status}`,
      );
    }
    if (claim.journalEntryId) {
      throw new BadRequestException("Claim has already been posted to accounting");
    }

    // 2. Resolve accounts
    const companyAccounts = await this.accountingService.getAccounts(companyId);

    // Find liability account for employee reimbursement (or generic Accounts Payable)
    let payableAccount = companyAccounts.find(
      (a) =>
        a.code === "2100" ||
        a.code === "2000" ||
        (a.type === "LIABILITY" && a.name.toLowerCase().includes("payable")),
    );

    payableAccount ??= companyAccounts.find((a) => a.type === "LIABILITY");

    if (!payableAccount) {
      throw new BadRequestException(
        "No suitable Liability/Payable account found in Chart of Accounts for expense reimbursement.",
      );
    }

    // Find fallback operating expense account if line category has no mapped account
    const fallbackExpenseAccount =
      companyAccounts.find(
        (a) =>
          a.type === "EXPENSE" &&
          (a.code === "6000" || a.code === "5000" || a.name.toLowerCase().includes("expense")),
      ) ?? companyAccounts.find((a) => a.type === "EXPENSE");

    if (!fallbackExpenseAccount) {
      throw new BadRequestException(
        "No Expense account found in Chart of Accounts. Please create an Expense account first.",
      );
    }

    // 3. Build journal lines: Debit each expense line, Credit the payable account for total
    const journalLinesData = [];
    const categories = await this.getCategories(companyId);
    const categoryMap = new Map(categories.map((c) => [c.id, c.accountId]));

    for (const line of claim.lines) {
      const mappedAccountId = categoryMap.get(line.categoryId) ?? fallbackExpenseAccount.id;
      journalLinesData.push({
        accountId: mappedAccountId,
        debit: line.amount,
        credit: "0",
        currency: claim.currency,
        exchangeRate: "1",
        description: `${claim.claimNumber} - ${line.description}`,
        partnerType: "EMPLOYEE" as const,
        partnerId: claim.employeeId,
        costCenter: line.costCenter ?? undefined,
      });
    }

    // Balancing line: Credit payable
    journalLinesData.push({
      accountId: payableAccount.id,
      debit: "0",
      credit: claim.totalAmount,
      currency: claim.currency,
      exchangeRate: "1",
      description: `Reimbursement Payable for ${claim.claimNumber}: ${claim.title}`,
      partnerType: "EMPLOYEE" as const,
      partnerId: claim.employeeId,
    });

    // 4. Create and post journal entry via AccountingService
    const createdJournal = await this.accountingService.createJournalEntry(companyId, actorId, {
      entryType: "EXPENSE",
      sourceModule: "EXPENSES",
      sourceReferenceId: claim.id,
      businessDate: new Date().toISOString().slice(0, 10),
      description: `Expense claim posting: ${claim.claimNumber} - ${claim.title}`,
      lines: journalLinesData,
    });

    await this.accountingService.postJournalEntry(companyId, actorId, createdJournal.id);

    // 5. Update claim status to POSTED with journal link
    await this.db.withTenant(companyId, async (tx) => {
      await tx
        .update(expenseClaims)
        .set({
          status: "POSTED",
          journalEntryId: createdJournal.id,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(expenseClaims.companyId, companyId), eq(expenseClaims.id, id)));
    });

    return this.getClaim(companyId, id);
  }
}
