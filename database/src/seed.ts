import "dotenv/config";
import dotenv from "dotenv";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  accountingPeriods,
  accounts,
  companies,
  expenseCategories,
  permissions,
  platformSettings,
  rolePermissions,
  roles,
} from "./index.js";

const permissionSeed = [
  ["company.view", "View the active company"],
  ["company.manage", "Manage company settings"],
  ["company.users.view", "View company users"],
  ["company.users.manage", "Invite, suspend, and change company user roles"],
  ["company.roles.manage", "Manage company roles and permissions"],
  ["audit.view", "View permitted company audit events"],
  ["inventory.view", "View company inventory masters and availability"],
  ["inventory.products.manage", "Manage products, variants, packaging, and barcodes"],
  ["inventory.units.manage", "Manage units of measurement"],
  ["inventory.categories.manage", "Manage product categories and brands"],
  ["inventory.warehouses.manage", "Manage warehouses and locations"],
  ["inventory.opening.enter", "Enter and post authorized opening stock"],
  ["inventory.adjustment.create", "Create stock adjustments"],
  ["inventory.adjustment.approve", "Approve and post stock adjustments"],
  ["inventory.transfer.create", "Create and dispatch stock transfers"],
  ["inventory.transfer.receive", "Receive stock transfers"],
  ["inventory.count.perform", "Perform physical stock counts"],
  ["inventory.count.approve", "Approve and post stock count differences"],
  ["inventory.ledger.view", "View the immutable inventory ledger"],
  ["inventory.export", "Export tenant-scoped inventory data"],
  ["purchase.suppliers.view", "View suppliers and purchase history"],
  ["purchase.suppliers.manage", "Manage suppliers, contacts, addresses, and tax details"],
  ["purchase.requisitions.view", "View purchase requisitions"],
  ["purchase.requisitions.create", "Create and submit purchase requisitions"],
  ["purchase.requisitions.approve", "Approve or reject purchase requisitions"],
  ["purchase.orders.view", "View purchase orders"],
  ["purchase.orders.create", "Create and submit purchase orders"],
  ["purchase.orders.approve", "Approve or reject purchase orders"],
  ["purchase.orders.cancel", "Cancel eligible purchase orders"],
  ["purchase.receipts.view", "View goods receipts"],
  ["purchase.receipts.create", "Create goods receipts"],
  ["purchase.receipts.approve", "Approve and post goods receipts"],
  ["purchase.invoices.view", "View purchase invoices and matching"],
  ["purchase.invoices.create", "Create purchase invoices"],
  ["purchase.invoices.approve", "Approve matched or exceptional purchase invoices"],
  ["purchase.returns.view", "View purchase returns"],
  ["purchase.returns.create", "Create purchase returns"],
  ["purchase.returns.approve", "Approve and post purchase returns"],
  ["purchase.landed-costs.manage", "Create and allocate landed costs"],
  ["purchase.payments.record", "Record supplier payments and allocations"],
  ["purchase.outstanding.view", "View supplier outstanding balances"],
  ["purchase.export", "Export tenant-scoped purchase data"],
  ["sales.customers.view", "View customers and customer history"],
  ["sales.customers.manage", "Manage customers, contacts, addresses, tax and credit settings"],
  ["sales.price-lists.view", "View sales price lists"],
  ["sales.price-lists.manage", "Manage effective-dated sales pricing"],
  ["sales.quotations.view", "View sales quotations"],
  ["sales.quotations.create", "Create and send sales quotations"],
  ["sales.quotations.approve", "Accept, reject, expire and cancel quotations"],
  ["sales.orders.view", "View sales orders"],
  ["sales.orders.create", "Create and submit sales orders"],
  ["sales.orders.approve", "Approve or reject sales orders"],
  ["sales.orders.cancel", "Cancel eligible sales orders"],
  ["sales.credit.override", "Approve customer credit-limit exceptions"],
  ["sales.reservations.manage", "Create and release stock reservations"],
  ["sales.deliveries.view", "View delivery challans"],
  ["sales.deliveries.create", "Create delivery challans"],
  ["sales.dispatch.approve", "Approve and post dispatches"],
  ["sales.invoices.view", "View sales invoices"],
  ["sales.invoices.create", "Create sales invoices"],
  ["sales.invoices.approve", "Approve sales invoices and exceptions"],
  ["sales.returns.view", "View sales returns"],
  ["sales.returns.create", "Create sales returns"],
  ["sales.returns.approve", "Approve and post sales returns"],
  ["sales.credit-notes.view", "View credit notes"],
  ["sales.credit-notes.create", "Create credit notes"],
  ["sales.credit-notes.approve", "Approve credit notes"],
  ["sales.payments.record", "Record and allocate customer payments"],
  ["sales.outstanding.view", "View customer outstanding balances"],
  ["sales.export", "Export tenant-scoped sales data"],
  ["accounting.view", "View chart of accounts, journals, and general ledger"],
  ["accounting.accounts.manage", "Manage chart of accounts"],
  ["accounting.periods.manage", "Open, close, and lock accounting periods"],
  ["accounting.journals.create", "Create and submit journal entries"],
  ["accounting.journals.post", "Post balanced journal entries"],
  ["accounting.journals.reverse", "Reverse posted journal entries"],
  ["accounting.reports.view", "View trial balance and financial statements"],
  ["accounting.export", "Export tenant-scoped accounting data"],
  ["expense.categories.manage", "Manage expense categories and policy limits"],
  ["expense.claims.view", "View expense claims"],
  ["expense.claims.create", "Create and submit expense claims"],
  ["expense.claims.approve", "Approve or reject expense claims"],
  ["expense.claims.post", "Post approved expense claims to accounting"],
  ["expense.export", "Export tenant-scoped expense data"],
  ["support.view", "View company support messages and help requests"],
  ["support.manage", "Reply to and resolve support messages"],
] as const;

const standardAccounts = [
  { code: "1000", name: "Cash on Hand", type: "ASSET", subtype: "CURRENT_ASSET" },
  { code: "1010", name: "Operating Bank Account", type: "ASSET", subtype: "CURRENT_ASSET" },
  {
    code: "1100",
    name: "Accounts Receivable",
    type: "ASSET",
    subtype: "CURRENT_ASSET",
    isControlAccount: true,
  },
  {
    code: "1200",
    name: "Inventory Asset",
    type: "ASSET",
    subtype: "CURRENT_ASSET",
    isControlAccount: true,
  },
  {
    code: "2000",
    name: "Accounts Payable",
    type: "LIABILITY",
    subtype: "CURRENT_LIABILITY",
    isControlAccount: true,
  },
  {
    code: "2100",
    name: "Employee Expense Reimbursement Payable",
    type: "LIABILITY",
    subtype: "CURRENT_LIABILITY",
    isControlAccount: true,
  },
  { code: "3000", name: "Retained Earnings", type: "EQUITY", subtype: "EQUITY" },
  { code: "4000", name: "Sales Revenue", type: "REVENUE", subtype: "OPERATING_REVENUE" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", subtype: "COST_OF_GOODS_SOLD" },
  {
    code: "6000",
    name: "General & Administrative Expenses",
    type: "EXPENSE",
    subtype: "OPERATING_EXPENSE",
  },
  { code: "6100", name: "Travel & Lodging", type: "EXPENSE", subtype: "OPERATING_EXPENSE" },
  { code: "6200", name: "Meals & Entertainment", type: "EXPENSE", subtype: "OPERATING_EXPENSE" },
  {
    code: "6300",
    name: "Office Supplies & Equipment",
    type: "EXPENSE",
    subtype: "OPERATING_EXPENSE",
  },
  {
    code: "6400",
    name: "Software & IT Subscriptions",
    type: "EXPENSE",
    subtype: "OPERATING_EXPENSE",
  },
];

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config();

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
const client = postgres(url, { max: 1 });
const db = drizzle(client);

await db.transaction(async (tx) => {
  // 1. Seed permissions
  for (const [code, description] of permissionSeed) {
    await tx.insert(permissions).values({ code, description }).onConflictDoUpdate({
      target: permissions.code,
      set: { description },
    });
  }

  // 2. Seed platform settings
  await tx
    .insert(platformSettings)
    .values({ key: "security", value: { loginLockoutAttempts: 5, loginLockoutMinutes: 15 } })
    .onConflictDoNothing();

  // 3. Grant all permissions to COMPANY_OWNER and COMPANY_ADMIN roles
  const allPermissions = await tx.select().from(permissions);
  const companyRoles = await tx.select().from(roles);

  for (const role of companyRoles) {
    if (role.code === "COMPANY_OWNER" || role.code === "COMPANY_ADMIN") {
      for (const p of allPermissions) {
        await tx
          .insert(rolePermissions)
          .values({
            companyId: role.companyId,
            roleId: role.id,
            permissionId: p.id,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 4. Seed standard chart of accounts, periods, and expense categories for all companies
  const allCompanies = await tx.select().from(companies);
  for (const comp of allCompanies) {
    // Standard Accounts
    const accountIdMap = new Map<string, string>();
    for (const acc of standardAccounts) {
      const [existing] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.companyId, comp.id), eq(accounts.code, acc.code)))
        .limit(1);

      if (!existing) {
        const [inserted] = await tx
          .insert(accounts)
          .values({
            companyId: comp.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype,
            currency: comp.baseCurrency || "USD",
            isControlAccount: acc.isControlAccount ?? false,
            isActive: true,
          })
          .returning();
        if (inserted) accountIdMap.set(acc.code, inserted.id);
      } else {
        accountIdMap.set(acc.code, existing.id);
      }
    }

    // Standard Period
    const currentYear = new Date().getFullYear().toString();
    const [period] = await tx
      .select()
      .from(accountingPeriods)
      .where(
        and(
          eq(accountingPeriods.companyId, comp.id),
          eq(accountingPeriods.name, `${currentYear}-FY`),
        ),
      )
      .limit(1);

    if (!period) {
      await tx.insert(accountingPeriods).values({
        companyId: comp.id,
        name: `${currentYear}-FY`,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        status: "OPEN",
      });
    }

    // Standard Expense Categories
    const categoriesToSeed = [
      {
        code: "TRAVEL",
        name: "Business Travel & Lodging",
        accountCode: "6100",
        policyLimit: "2000.0000",
      },
      { code: "MEALS", name: "Client & Team Meals", accountCode: "6200", policyLimit: "150.0000" },
      {
        code: "SUPPLIES",
        name: "Office Supplies & Equipment",
        accountCode: "6300",
        policyLimit: "500.0000",
      },
      {
        code: "SOFTWARE",
        name: "Software & Cloud Services",
        accountCode: "6400",
        policyLimit: "1000.0000",
      },
    ];

    for (const cat of categoriesToSeed) {
      const [existing] = await tx
        .select()
        .from(expenseCategories)
        .where(and(eq(expenseCategories.companyId, comp.id), eq(expenseCategories.code, cat.code)))
        .limit(1);

      if (!existing) {
        await tx.insert(expenseCategories).values({
          companyId: comp.id,
          code: cat.code,
          name: cat.name,
          accountId: accountIdMap.get(cat.accountCode) ?? null,
          policyLimit: cat.policyLimit,
          isActive: true,
        });
      }
    }
  }

  await tx.execute(sql`select 1`);
});

await client.end();
console.log(
  `Seeded ${permissionSeed.length.toString()} permissions, standard Chart of Accounts, and Expense Categories.`,
);
