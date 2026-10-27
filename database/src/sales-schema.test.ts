import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(
  new URL("../migrations/0003_customer_sales_engine.sql", import.meta.url),
  "utf8",
);
const tables = [
  "customers",
  "customer_contacts",
  "customer_addresses",
  "customer_categories",
  "customer_price_assignments",
  "price_lists",
  "price_list_items",
  "sales_quotations",
  "sales_quotation_lines",
  "sales_orders",
  "sales_order_lines",
  "sales_order_approvals",
  "stock_reservations",
  "stock_reservation_lines",
  "delivery_challans",
  "delivery_challan_lines",
  "delivery_challan_batches",
  "delivery_challan_serial_numbers",
  "sales_invoices",
  "sales_invoice_lines",
  "sales_returns",
  "sales_return_lines",
  "sales_return_batches",
  "sales_return_serial_numbers",
  "credit_notes",
  "credit_note_lines",
  "customer_payments",
  "customer_payment_allocations",
];
describe("sales schema", () => {
  it("creates every required tenant table", () => {
    for (const table of tables) expect(sql).toContain(`create table ${table}`);
  });
  it("forces RLS on every sales table", () => {
    expect(sql).toContain("force row level security");
    for (const table of tables) expect(sql).toContain(`'${table}'`);
  });
  it("uses exact numeric quantities and money", () => {
    expect(sql).toContain("numeric(24,8)");
    expect(sql).toContain("numeric(20,4)");
    expect(sql).not.toMatch(/\b(real|double precision)\b/);
  });
  it("uses composite tenant references and immutable history", () => {
    expect(sql).toContain("foreign key(company_id");
    expect(sql).toContain("reject_sales_history_mutation");
    expect(sql).toContain("customer_payment_allocations_immutable");
  });
});
