import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  new URL("../migrations/0002_purchase_supplier_engine.sql", import.meta.url),
  "utf8",
).toLowerCase();
const tables = [
  "suppliers",
  "supplier_contacts",
  "supplier_addresses",
  "supplier_bank_accounts",
  "supplier_categories",
  "purchase_requisitions",
  "purchase_requisition_lines",
  "purchase_orders",
  "purchase_order_lines",
  "purchase_order_approvals",
  "goods_receipts",
  "goods_receipt_lines",
  "goods_receipt_batches",
  "goods_receipt_serial_numbers",
  "purchase_invoices",
  "purchase_invoice_lines",
  "purchase_invoice_matches",
  "purchase_returns",
  "purchase_return_lines",
  "purchase_return_batches",
  "purchase_return_serial_numbers",
  "landed_costs",
  "landed_cost_lines",
  "landed_cost_allocations",
  "supplier_payments",
  "supplier_payment_allocations",
];
describe("purchase migration", () => {
  it("creates every required entity", () => {
    for (const table of tables) expect(sql).toContain(`create table ${table}`);
  });
  it("forces tenant row-level security on every purchase table", () => {
    expect(sql).toContain("force row level security");
    for (const table of tables) expect(sql).toContain(`'${table}'`);
  });
  it("uses company-scoped composite references", () => {
    expect(sql).toContain("foreign key(company_id,supplier_id)");
    expect(sql).toContain("foreign key(company_id,purchase_order_id)");
    expect(sql).toContain("foreign key(company_id,goods_receipt_id)");
  });
  it("uses exact decimal quantities and money", () => {
    expect(sql).toContain("numeric(24,8)");
    expect(sql).toContain("numeric(20,4)");
    expect(sql).not.toMatch(/\b(real|double precision)\b/);
  });
  it("stores supplier bank details as encrypted payload plus mask", () => {
    expect(sql).toContain("masked_account text not null");
    expect(sql).toContain("encrypted_payload text not null");
    expect(sql).toContain("key_reference text not null");
  });
  it("archives supplier contacts and addresses without erasing history", () => {
    expect(/create table supplier_contacts[^;]+archived_at timestamptz/s.exec(sql)).toBeTruthy();
    expect(/create table supplier_addresses[^;]+archived_at timestamptz/s.exec(sql)).toBeTruthy();
  });
  it("protects approval, match, allocation history", () => {
    for (const name of [
      "purchase_order_approvals_immutable",
      "purchase_invoice_matches_immutable",
      "supplier_payment_allocations_immutable",
      "landed_cost_allocations_immutable",
    ])
      expect(sql).toContain(name);
  });
});
