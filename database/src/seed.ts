import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { permissions, platformSettings } from "./schema.js";

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
] as const;

import dotenv from "dotenv";
import path from "node:path";

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
  for (const [code, description] of permissionSeed) {
    await tx.insert(permissions).values({ code, description }).onConflictDoUpdate({
      target: permissions.code,
      set: { description },
    });
  }
  await tx
    .insert(platformSettings)
    .values({ key: "security", value: { loginLockoutAttempts: 5, loginLockoutMinutes: 15 } })
    .onConflictDoNothing();
  await tx.execute(sql`select 1`);
});

await client.end();
console.log(`Seeded ${permissionSeed.length.toString()} stable permissions and platform defaults.`);
