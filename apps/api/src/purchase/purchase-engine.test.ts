import { describe, expect, it } from "vitest";
import { PurchaseEngine, PurchaseRuleError } from "./purchase-engine.js";
const a = "company-a",
  b = "company-b";
function order(
  engine: PurchaseEngine,
  company = a,
  options: Partial<{
    packageQuantity: string;
    conversion: string;
    packagePrice: string;
    tracking: "NONE" | "BATCH" | "SERIAL";
  }> = {},
) {
  return engine.createOrder(company, {
    variantId: "variant-1",
    packageQuantity: options.packageQuantity ?? "10",
    conversion: options.conversion ?? "120",
    packagePrice: options.packagePrice ?? "1950",
    ...(options.tracking ? { tracking: options.tracking } : {}),
  });
}
describe("purchase domain", () => {
  it("isolates suppliers", () => {
    const e = new PurchaseEngine(),
      s = e.createSupplier(a);
    expect(() => e.getSupplier(b, s.id)).toThrow(PurchaseRuleError);
  });
  it("purchase orders have no stock effect", () => {
    const e = new PurchaseEngine(),
      { order: o } = order(e);
    expect(e.stockEffect(a, o.id)).toBe("0");
  });
  it("receives three cartons as 360 pieces", () => {
    const e = new PurchaseEngine(),
      { line } = order(e, a, { packageQuantity: "3" });
    expect(e.receive(a, { lineId: line.id, packageQuantity: "3" }).quantity.toString()).toBe("360");
  });
  it("partial receipt keeps five cartons pending", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    e.receive(a, { lineId: line.id, packageQuantity: "5" });
    expect(e.pendingBase(a, line.id)).toBe("600");
  });
  it("requires a batch", () => {
    const e = new PurchaseEngine(),
      { line } = order(e, a, { tracking: "BATCH" });
    expect(() => e.receive(a, { lineId: line.id, packageQuantity: "1" })).toThrow(/Batch/);
  });
  it("rejects duplicate serials", () => {
    const e = new PurchaseEngine(),
      { line } = order(e, a, { packageQuantity: "2", conversion: "1", tracking: "SERIAL" });
    e.receive(a, { lineId: line.id, packageQuantity: "1", serialNumbers: ["S1"] });
    expect(() =>
      e.receive(a, { lineId: line.id, packageQuantity: "1", serialNumbers: ["S1"] }),
    ).toThrow(/Serial/);
  });
  it("goods receipt appends an immutable ledger view", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    e.receive(a, { lineId: line.id, packageQuantity: "1" });
    const rows = e.ledgerEntries(a);
    expect(rows).toHaveLength(1);
    expect(Object.isFrozen(rows[0])).toBe(true);
  });
  it("return appends a negative ledger entry", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    e.receive(a, { lineId: line.id, packageQuantity: "2" });
    expect(e.returnGoods(a, line.id, "1").quantity.toString()).toBe("-120");
  });
  it("return cannot exceed received", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    e.receive(a, { lineId: line.id, packageQuantity: "1" });
    expect(() => e.returnGoods(a, line.id, "2")).toThrow(/exceeds/);
  });
  it("detects invoice quantity and price mismatch", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    e.receive(a, { lineId: line.id, packageQuantity: "1" });
    expect(e.matchInvoice(a, line.id, "100", "2000").issues).toEqual([
      "QUANTITY_MISMATCH",
      "PRICE_MISMATCH",
    ]);
  });
  it("allocates landed cost by quantity", () => {
    const e = new PurchaseEngine();
    expect(e.allocateLandedCost("300", ["1", "2"])).toEqual(["100", "200"]);
  });
  it("prevents payment over-allocation", () => {
    const e = new PurchaseEngine(),
      id = e.createInvoice(a, "500");
    expect(() => e.allocatePayment(a, id, "501")).toThrow(/exceeds/);
  });
  it("requires approval permission", () => {
    const e = new PurchaseEngine(),
      { order: o } = order(e);
    expect(() => e.approve(a, o.id, new Set())).toThrow(/permission/i);
    expect(() => e.approve(a, o.id, new Set(["purchase.orders.approve"]))).not.toThrow();
  });
  it("preserves snapshotted purchase price", () => {
    const e = new PurchaseEngine(),
      { line } = order(e, a, { packagePrice: "1950" });
    order(e, a, { packagePrice: "2100" });
    expect(e.priceSnapshot(a, line.id)).toBe("1950");
  });
  it("isolates every purchase aggregate", () => {
    const e = new PurchaseEngine(),
      { line } = order(e);
    const invoice = e.createInvoice(a, "100");
    expect(() => e.receive(b, { lineId: line.id, packageQuantity: "1" })).toThrow(/not found/);
    expect(() => e.returnGoods(b, line.id, "1")).toThrow(/not found/);
    expect(() => e.matchInvoice(b, line.id, "1", "1")).toThrow(/not found/);
    expect(() => e.allocatePayment(b, invoice, "1")).toThrow(/not found/);
    expect(e.ledgerEntries(b)).toHaveLength(0);
  });
});
