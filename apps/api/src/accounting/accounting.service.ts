import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { accountingPeriods, accounts, journalEntries, journalLines } from "@erp/database/schema";
import type { AccountInput, AccountingPeriodInput, JournalEntryInput } from "@erp/types";
import { DatabaseService } from "../database/database.service.js";
import { FixedDecimal } from "../inventory/decimal.js";

type ListQuery = {
  search?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
};

@Injectable()
export class AccountingService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------------------------------------------
  // Chart of Accounts
  // ----------------------------------------------------
  async getAccounts(companyId: string, query?: ListQuery) {
    return this.db.withTenant(companyId, async (tx) => {
      const conditions = [eq(accounts.companyId, companyId)];
      if (query?.search) {
        conditions.push(
          sql`(${ilike(accounts.code, `%${query.search}%`)} OR ${ilike(accounts.name, `%${query.search}%`)})`,
        );
      }
      return tx
        .select()
        .from(accounts)
        .where(and(...conditions))
        .orderBy(asc(accounts.code))
        .limit(query?.limit ?? 200);
    });
  }

  async getAccountById(companyId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [account] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.companyId, companyId), eq(accounts.id, id)))
        .limit(1);
      if (!account) throw new NotFoundException("Account not found");
      return account;
    });
  }

  async createAccount(companyId: string, actorId: string, input: AccountInput) {
    return this.db.withTenant(companyId, async (tx) => {
      const [existing] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.companyId, companyId), eq(accounts.code, input.code)))
        .limit(1);
      if (existing) {
        throw new ConflictException(`Account with code ${input.code} already exists`);
      }

      const [created] = await tx
        .insert(accounts)
        .values({
          companyId,
          code: input.code,
          name: input.name,
          type: input.type,
          subtype: input.subtype,
          currency: input.currency,
          description: input.description,
          parentAccountId: input.parentAccountId,
          isControlAccount: input.isControlAccount,
          isActive: input.isActive,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      return created;
    });
  }

  // ----------------------------------------------------
  // Accounting Periods
  // ----------------------------------------------------
  async getPeriods(companyId: string) {
    return this.db.withTenant(companyId, async (tx) => {
      return tx
        .select()
        .from(accountingPeriods)
        .where(eq(accountingPeriods.companyId, companyId))
        .orderBy(desc(accountingPeriods.startDate));
    });
  }

  async createPeriod(companyId: string, actorId: string, input: AccountingPeriodInput) {
    return this.db.withTenant(companyId, async (tx) => {
      const [existing] = await tx
        .select({ id: accountingPeriods.id })
        .from(accountingPeriods)
        .where(
          and(eq(accountingPeriods.companyId, companyId), eq(accountingPeriods.name, input.name)),
        )
        .limit(1);
      if (existing) {
        throw new ConflictException(`Accounting period ${input.name} already exists`);
      }

      const [created] = await tx
        .insert(accountingPeriods)
        .values({
          companyId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      return created;
    });
  }

  async setPeriodStatus(
    companyId: string,
    actorId: string,
    periodId: string,
    status: "OPEN" | "SOFT_CLOSED" | "LOCKED",
  ) {
    return this.db.withTenant(companyId, async (tx) => {
      const [period] = await tx
        .select()
        .from(accountingPeriods)
        .where(and(eq(accountingPeriods.companyId, companyId), eq(accountingPeriods.id, periodId)))
        .limit(1);
      if (!period) throw new NotFoundException("Accounting period not found");

      const [updated] = await tx
        .update(accountingPeriods)
        .set({
          status,
          closedAt: status === "LOCKED" ? new Date() : null,
          closedBy: status === "LOCKED" ? actorId : null,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(accountingPeriods.companyId, companyId), eq(accountingPeriods.id, periodId)))
        .returning();

      return updated;
    });
  }

  // ----------------------------------------------------
  // Journal Entries
  // ----------------------------------------------------
  async getJournalEntries(
    companyId: string,
    filter?: {
      status?: string | undefined;
      fromDate?: string | undefined;
      toDate?: string | undefined;
      search?: string | undefined;
      limit?: number | undefined;
    },
  ) {
    return this.db.withTenant(companyId, async (tx) => {
      const conditions = [eq(journalEntries.companyId, companyId)];
      if (filter?.status) {
        conditions.push(eq(journalEntries.status, filter.status));
      }
      if (filter?.fromDate) {
        conditions.push(gte(journalEntries.businessDate, filter.fromDate));
      }
      if (filter?.toDate) {
        conditions.push(lte(journalEntries.businessDate, filter.toDate));
      }
      if (filter?.search) {
        conditions.push(
          sql`(${ilike(journalEntries.entryNumber, `%${filter.search}%`)} OR ${ilike(journalEntries.description, `%${filter.search}%`)})`,
        );
      }

      return tx
        .select()
        .from(journalEntries)
        .where(and(...conditions))
        .orderBy(desc(journalEntries.businessDate), desc(journalEntries.createdAt))
        .limit(filter?.limit ?? 100);
    });
  }

  async getJournalEntry(companyId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [entry] = await tx
        .select()
        .from(journalEntries)
        .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.id, id)))
        .limit(1);
      if (!entry) throw new NotFoundException("Journal entry not found");

      const lines = await tx
        .select({
          id: journalLines.id,
          journalEntryId: journalLines.journalEntryId,
          lineNumber: journalLines.lineNumber,
          accountId: journalLines.accountId,
          accountCode: accounts.code,
          accountName: accounts.name,
          accountType: accounts.type,
          debit: journalLines.debit,
          credit: journalLines.credit,
          currency: journalLines.currency,
          exchangeRate: journalLines.exchangeRate,
          baseDebit: journalLines.baseDebit,
          baseCredit: journalLines.baseCredit,
          description: journalLines.description,
          partnerType: journalLines.partnerType,
          partnerId: journalLines.partnerId,
          costCenter: journalLines.costCenter,
          projectCode: journalLines.projectCode,
        })
        .from(journalLines)
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .where(and(eq(journalLines.companyId, companyId), eq(journalLines.journalEntryId, id)))
        .orderBy(asc(journalLines.lineNumber));

      return { ...entry, lines };
    });
  }

  async createJournalEntry(companyId: string, actorId: string, input: JournalEntryInput) {
    return this.db.withTenant(companyId, async (tx) => {
      // 1. Check if target period is locked
      const [lockedPeriod] = await tx
        .select({ id: accountingPeriods.id, name: accountingPeriods.name })
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.companyId, companyId),
            eq(accountingPeriods.status, "LOCKED"),
            lte(accountingPeriods.startDate, input.businessDate),
            gte(accountingPeriods.endDate, input.businessDate),
          ),
        )
        .limit(1);

      if (lockedPeriod) {
        throw new BadRequestException(
          `Cannot create journal entry in locked accounting period "${lockedPeriod.name}"`,
        );
      }

      // 2. Validate line count
      if (input.lines.length < 2) {
        throw new BadRequestException("Journal entry must have at least 2 lines");
      }

      // 3. Validate accounts existence
      const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
      const foundAccounts = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.companyId, companyId), inArray(accounts.id, accountIds)));

      if (foundAccounts.length !== accountIds.length) {
        throw new BadRequestException("One or more accounts in journal lines do not exist");
      }

      // 4. Compute and verify double-entry totals
      let totalDebit = FixedDecimal.zero();
      let totalCredit = FixedDecimal.zero();

      for (const line of input.lines) {
        const d = FixedDecimal.parse(line.debit || "0");
        const c = FixedDecimal.parse(line.credit || "0");

        if (d.isNegative() || c.isNegative()) {
          throw new BadRequestException("Debit and credit amounts cannot be negative");
        }
        if (!d.isZero() && !c.isZero()) {
          throw new BadRequestException("A journal line cannot have both debit and credit");
        }
        if (d.isZero() && c.isZero()) {
          throw new BadRequestException("A journal line must have either debit or credit");
        }

        totalDebit = totalDebit.add(d);
        totalCredit = totalCredit.add(c);
      }

      if (totalDebit.isZero()) {
        throw new BadRequestException("Journal entry total amount cannot be zero");
      }

      const isBalanced = totalDebit.equals(totalCredit);

      // 5. Generate entryNumber if not provided
      let entryNumber = input.entryNumber;
      if (!entryNumber) {
        const datePrefix = input.businessDate.replace(/-/g, "");
        const rand = Math.floor(1000 + Math.random() * 9000).toString();
        entryNumber = `JE-${datePrefix}-${rand}`;
      }

      // 6. Insert Header
      const [header] = await tx
        .insert(journalEntries)
        .values({
          companyId,
          entryNumber,
          entryType: input.entryType,
          sourceModule: input.sourceModule ?? "MANUAL",
          sourceReferenceId: input.sourceReferenceId,
          businessDate: input.businessDate,
          status: "DRAFT",
          isBalanced,
          totalDebit: totalDebit.toString(),
          totalCredit: totalCredit.toString(),
          description: input.description,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      if (!header) throw new BadRequestException("Failed to create journal entry");

      // 7. Insert Lines
      let lineNumber = 1;
      for (const line of input.lines) {
        await tx.insert(journalLines).values({
          companyId,
          journalEntryId: header.id,
          lineNumber: lineNumber++,
          accountId: line.accountId,
          debit: line.debit || "0",
          credit: line.credit || "0",
          currency: line.currency || "USD",
          exchangeRate: line.exchangeRate || "1",
          baseDebit: line.debit || "0",
          baseCredit: line.credit || "0",
          description: line.description,
          partnerType: line.partnerType,
          partnerId: line.partnerId,
          costCenter: line.costCenter,
          projectCode: line.projectCode,
        });
      }

      return this.getJournalEntry(companyId, header.id);
    });
  }

  async postJournalEntry(companyId: string, actorId: string, id: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [entry] = await tx
        .select()
        .from(journalEntries)
        .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.id, id)))
        .limit(1);

      if (!entry) throw new NotFoundException("Journal entry not found");
      if (entry.status !== "DRAFT") {
        throw new BadRequestException(`Cannot post journal entry in status ${entry.status}`);
      }

      if (!entry.isBalanced) {
        throw new BadRequestException(
          "Cannot post unbalanced journal entry. Total debits must equal credits.",
        );
      }

      // Verify period is open
      const [lockedPeriod] = await tx
        .select({ name: accountingPeriods.name })
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.companyId, companyId),
            eq(accountingPeriods.status, "LOCKED"),
            lte(accountingPeriods.startDate, entry.businessDate),
            gte(accountingPeriods.endDate, entry.businessDate),
          ),
        )
        .limit(1);

      if (lockedPeriod) {
        throw new BadRequestException(
          `Cannot post journal entry to locked period "${lockedPeriod.name}"`,
        );
      }

      const [updated] = await tx
        .update(journalEntries)
        .set({
          status: "POSTED",
          postedAt: new Date(),
          postedBy: actorId,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.id, id)))
        .returning();

      return updated;
    });
  }

  async reverseJournalEntry(companyId: string, actorId: string, id: string, reason?: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const [entry] = await tx
        .select()
        .from(journalEntries)
        .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.id, id)))
        .limit(1);

      if (!entry) throw new NotFoundException("Journal entry not found");
      if (entry.status !== "POSTED") {
        throw new BadRequestException("Only POSTED journal entries can be reversed");
      }
      if (entry.reversedAt) {
        throw new BadRequestException("Journal entry is already reversed");
      }

      const lines = await tx
        .select()
        .from(journalLines)
        .where(and(eq(journalLines.companyId, companyId), eq(journalLines.journalEntryId, id)))
        .orderBy(asc(journalLines.lineNumber));

      // Generate reversal entry number
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000).toString();
      const reversalNumber = `REV-${datePrefix}-${rand}`;

      // Create new reversal journal entry
      const [reversalHeader] = await tx
        .insert(journalEntries)
        .values({
          companyId,
          entryNumber: reversalNumber,
          entryType: "REVERSAL",
          sourceModule: "ACCOUNTING",
          sourceReferenceId: entry.id,
          businessDate: new Date().toISOString().slice(0, 10),
          status: "POSTED",
          isBalanced: true,
          totalDebit: entry.totalCredit,
          totalCredit: entry.totalDebit,
          description: `Reversal of ${entry.entryNumber}: ${reason ?? "Reversal correction"}`,
          postedAt: new Date(),
          postedBy: actorId,
          reversalOfId: entry.id,
          reversalReason: reason,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();

      if (!reversalHeader) throw new BadRequestException("Failed to create reversal entry");

      // Swap debit and credit for reversal lines
      for (const line of lines) {
        await tx.insert(journalLines).values({
          companyId,
          journalEntryId: reversalHeader.id,
          lineNumber: line.lineNumber,
          accountId: line.accountId,
          debit: line.credit,
          credit: line.debit,
          currency: line.currency,
          exchangeRate: line.exchangeRate,
          baseDebit: line.baseCredit,
          baseCredit: line.baseDebit,
          description: `Reversal of line ${line.lineNumber.toString()}: ${line.description ?? ""}`,
          partnerType: line.partnerType,
          partnerId: line.partnerId,
          costCenter: line.costCenter,
          projectCode: line.projectCode,
        });
      }

      // Mark original entry as reversed
      await tx
        .update(journalEntries)
        .set({
          reversedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(journalEntries.companyId, companyId), eq(journalEntries.id, id)));

      return this.getJournalEntry(companyId, reversalHeader.id);
    });
  }

  // ----------------------------------------------------
  // General Ledger
  // ----------------------------------------------------
  async getGeneralLedger(
    companyId: string,
    filter?: {
      accountId?: string | undefined;
      fromDate?: string | undefined;
      toDate?: string | undefined;
    },
  ) {
    return this.db.withTenant(companyId, async (tx) => {
      const conditions = [
        eq(journalLines.companyId, companyId),
        eq(journalEntries.status, "POSTED"),
      ];

      if (filter?.accountId) {
        conditions.push(eq(journalLines.accountId, filter.accountId));
      }
      if (filter?.fromDate) {
        conditions.push(gte(journalEntries.businessDate, filter.fromDate));
      }
      if (filter?.toDate) {
        conditions.push(lte(journalEntries.businessDate, filter.toDate));
      }

      const rows = await tx
        .select({
          lineId: journalLines.id,
          journalEntryId: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          businessDate: journalEntries.businessDate,
          entryDescription: journalEntries.description,
          accountId: accounts.id,
          accountCode: accounts.code,
          accountName: accounts.name,
          accountType: accounts.type,
          debit: journalLines.debit,
          credit: journalLines.credit,
          description: journalLines.description,
          costCenter: journalLines.costCenter,
          partnerType: journalLines.partnerType,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .where(and(...conditions))
        .orderBy(
          asc(journalEntries.businessDate),
          asc(journalEntries.entryNumber),
          asc(journalLines.lineNumber),
        );

      // Calculate running balance per account
      const accountBalances = new Map<string, FixedDecimal>();
      const enriched = rows.map((row) => {
        const currentBalance = accountBalances.get(row.accountId) ?? FixedDecimal.zero();
        const d = FixedDecimal.parse(row.debit || "0");
        const c = FixedDecimal.parse(row.credit || "0");

        // Normal balance rule: Assets and Expenses increase with Debit; Liabilities, Equity, Revenue with Credit
        const isDebitNormal = row.accountType === "ASSET" || row.accountType === "EXPENSE";
        const newBalance = isDebitNormal
          ? currentBalance.add(d).subtract(c)
          : currentBalance.add(c).subtract(d);

        accountBalances.set(row.accountId, newBalance);

        return {
          ...row,
          runningBalance: newBalance.toString(),
        };
      });

      return enriched;
    });
  }

  // ----------------------------------------------------
  // Trial Balance
  // ----------------------------------------------------
  async getTrialBalance(companyId: string, asOfDate?: string) {
    return this.db.withTenant(companyId, async (tx) => {
      const conditions = [
        eq(journalLines.companyId, companyId),
        eq(journalEntries.status, "POSTED"),
      ];
      if (asOfDate) {
        conditions.push(lte(journalEntries.businessDate, asOfDate));
      }

      const lines = await tx
        .select({
          accountId: accounts.id,
          accountCode: accounts.code,
          accountName: accounts.name,
          accountType: accounts.type,
          debit: journalLines.debit,
          credit: journalLines.credit,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
        .where(and(...conditions));

      type AccountAggregate = {
        accountId: string;
        accountCode: string;
        accountName: string;
        accountType: string;
        totalDebit: FixedDecimal;
        totalCredit: FixedDecimal;
      };

      const accountMap = new Map<string, AccountAggregate>();

      for (const line of lines) {
        const existing = accountMap.get(line.accountId) ?? {
          accountId: line.accountId,
          accountCode: line.accountCode,
          accountName: line.accountName,
          accountType: line.accountType,
          totalDebit: FixedDecimal.zero(),
          totalCredit: FixedDecimal.zero(),
        };

        existing.totalDebit = existing.totalDebit.add(FixedDecimal.parse(line.debit || "0"));
        existing.totalCredit = existing.totalCredit.add(FixedDecimal.parse(line.credit || "0"));
        accountMap.set(line.accountId, existing);
      }

      let grandTotalDebit = FixedDecimal.zero();
      let grandTotalCredit = FixedDecimal.zero();

      const items = Array.from(accountMap.values())
        .map((acc) => {
          grandTotalDebit = grandTotalDebit.add(acc.totalDebit);
          grandTotalCredit = grandTotalCredit.add(acc.totalCredit);

          const net = acc.totalDebit.subtract(acc.totalCredit);
          const isNetDebit = net.compare(FixedDecimal.zero()) >= 0;

          return {
            accountId: acc.accountId,
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            accountType: acc.accountType,
            totalDebit: acc.totalDebit.toString(),
            totalCredit: acc.totalCredit.toString(),
            netDebit: isNetDebit ? net.toString() : "0",
            netCredit: !isNetDebit ? net.negate().toString() : "0",
          };
        })
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      const isBalanced = grandTotalDebit.equals(grandTotalCredit);

      return {
        asOfDate: asOfDate ?? new Date().toISOString().slice(0, 10),
        isBalanced,
        grandTotalDebit: grandTotalDebit.toString(),
        grandTotalCredit: grandTotalCredit.toString(),
        items,
      };
    });
  }
}
