import { describe, expect, it } from "vitest";
import { SalesEngine } from "./sales-engine.js";
const setup = (tracking: "NONE" | "BATCH" | "SERIAL" = "NONE") => {
  const e = new SalesEngine(),
    c = e.createCustomer("a", "10000");
  e.setStock("a", "v", "500");
  const { order, line } = e.createOrder("a", {
    customerId: c.id,
    variantId: "v",
    packageQuantity: "2",
    conversion: "120",
    packagePrice: "100",
    tracking,
  });
  e.approve("a", order.id, c.id, new Set(["sales.orders.approve"]));
  return { e, c, order, line };
};
describe("sales domain", () => {
  it("isolates customers", () => {
    const e = new SalesEngine(),
      c = e.createCustomer("a");
    expect(() => e.getCustomer("b", c.id)).toThrow(/not found/i);
  });
  it("quotation has no stock effect", () => {
    const e = new SalesEngine(),
      q = e.createQuotation("a");
    expect(e.quotationStockEffect("a", q.id)).toBe("0");
  });
  it("order has no physical stock effect", () => {
    const { e, order } = setup();
    expect(e.orderStockEffect("a", order.id)).toBe("0");
    expect(e.physical("a", "v")).toBe("500");
  });
  it("reservation changes available not physical", () => {
    const { e, line } = setup();
    e.reserve("a", line.id, "1");
    expect(e.physical("a", "v")).toBe("500");
    expect(e.available("a", "v").toString()).toBe("380");
  });
  it("reserves two cartons as 240 pieces", () => {
    const { e, line } = setup();
    expect(e.reserve("a", line.id, "2")).toBe("240");
  });
  it("dispatches one carton as immutable decrease", () => {
    const { e, line } = setup();
    e.reserve("a", line.id, "2");
    expect(e.dispatch("a", { lineId: line.id, packageQuantity: "1" }).quantity.toString()).toBe(
      "-120",
    );
    expect(e.ledgerEntries("a")[0]?.quantity).toBe("-120");
  });
  it("partial dispatch updates pending and reservation", () => {
    const { e, line } = setup();
    e.reserve("a", line.id, "2");
    e.dispatch("a", { lineId: line.id, packageQuantity: "1" });
    expect(e.pendingBase("a", line.id)).toBe("120");
    expect(e.reserved("a", "v")).toBe("120");
  });
  it("batch dispatch requires batch", () => {
    const { e, line } = setup("BATCH");
    expect(() => e.dispatch("a", { lineId: line.id, packageQuantity: "1" })).toThrow(/Batch/);
  });
  it("serial cannot dispatch twice", () => {
    const { e, line } = setup("SERIAL");
    const serials = Array.from({ length: 120 }, (_, i) => `S${i.toString()}`);
    e.dispatch("a", { lineId: line.id, packageQuantity: "1", serialNumbers: serials });
    expect(() =>
      e.dispatch("a", { lineId: line.id, packageQuantity: "1", serialNumbers: serials }),
    ).toThrow(/unavailable/);
  });
  it("immediate invoice makes one dispatch", () => {
    const { e, line } = setup();
    e.immediateInvoice("a", line.id, "1", "key");
    e.immediateInvoice("a", line.id, "1", "key");
    expect(e.ledgerEntries("a")).toHaveLength(1);
  });
  it("return increases stock through ledger", () => {
    const { e, line } = setup();
    e.dispatch("a", { lineId: line.id, packageQuantity: "1" });
    expect(e.returnGoods("a", line.id, "1").quantity.toString()).toBe("120");
    expect(e.physical("a", "v")).toBe("500");
  });
  it("return cannot exceed dispatch", () => {
    const { e, line } = setup();
    expect(() => e.returnGoods("a", line.id, "1")).toThrow(/exceeds/);
  });
  it("credit limit breach requires override", () => {
    const e = new SalesEngine(),
      c = e.createCustomer("a", "50"),
      { order } = e.createOrder("a", {
        customerId: c.id,
        variantId: "v",
        packageQuantity: "1",
        conversion: "1",
        packagePrice: "100",
      });
    expect(() => e.approve("a", order.id, c.id, new Set(["sales.orders.approve"]))).toThrow(
      /Credit/,
    );
  });
  it("payment cannot exceed outstanding", () => {
    const e = new SalesEngine(),
      c = e.createCustomer("a"),
      i = e.createInvoice("a", c.id, "100");
    expect(() => e.allocatePayment("a", i, "101")).toThrow(/outstanding/);
  });
  it("approval requires permission", () => {
    const e = new SalesEngine(),
      c = e.createCustomer("a", "100"),
      { order } = e.createOrder("a", {
        customerId: c.id,
        variantId: "v",
        packageQuantity: "1",
        conversion: "1",
        packagePrice: "1",
      });
    expect(() => e.approve("a", order.id, c.id, new Set())).toThrow(/permission/);
  });
  it("historical price remains snapshotted", () => {
    const { e, line } = setup();
    expect(e.priceSnapshot("a", line.id)).toBe("100");
  });
  it("isolates all sales aggregates", () => {
    const { e, line } = setup();
    expect(() => e.reserve("b", line.id, "1")).toThrow(/not found/);
    expect(e.ledgerEntries("b")).toHaveLength(0);
  });
});
