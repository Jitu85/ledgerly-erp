import { FixedDecimal } from "../inventory/decimal.js";
export type TrackingMode = "NONE" | "BATCH" | "SERIAL";
type Tenant = { id: string; companyId: string };
type Line = Tenant & {
  orderId: string;
  variantId: string;
  ordered: FixedDecimal;
  conversion: FixedDecimal;
  received: FixedDecimal;
  returned: FixedDecimal;
  invoiced: FixedDecimal;
  price: FixedDecimal;
  tracking: TrackingMode;
};
type Ledger = Tenant & {
  kind: "PURCHASE_RECEIPT" | "PURCHASE_RETURN";
  sourceId: string;
  variantId: string;
  quantity: FixedDecimal;
  batch?: string;
  serials: string[];
};
export class PurchaseRuleError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export class PurchaseEngine {
  private seq = 0;
  private suppliers: Tenant[] = [];
  private orders: (Tenant & { approved: boolean })[] = [];
  private lines: Line[] = [];
  private ledger: Ledger[] = [];
  private serials = new Set<string>();
  private invoices = new Map<string, { companyId: string; outstanding: FixedDecimal }>();
  createSupplier(companyId: string) {
    const row = { id: this.id(), companyId };
    this.suppliers.push(row);
    return row;
  }
  getSupplier(companyId: string, id: string) {
    return this.require(this.suppliers, companyId, id);
  }
  createOrder(
    companyId: string,
    input: {
      variantId: string;
      packageQuantity: string;
      conversion: string;
      packagePrice: string;
      tracking?: TrackingMode;
    },
  ) {
    const order = { id: this.id(), companyId, approved: false };
    this.orders.push(order);
    const line = {
      id: this.id(),
      companyId,
      orderId: order.id,
      variantId: input.variantId,
      ordered: FixedDecimal.parse(input.packageQuantity),
      conversion: FixedDecimal.parse(input.conversion),
      received: FixedDecimal.zero(),
      returned: FixedDecimal.zero(),
      invoiced: FixedDecimal.zero(),
      price: FixedDecimal.parse(input.packagePrice),
      tracking: input.tracking ?? "NONE",
    };
    this.lines.push(line);
    return { order, line };
  }
  approve(companyId: string, orderId: string, permissions: Set<string>) {
    if (!permissions.has("purchase.orders.approve"))
      throw new PurchaseRuleError("PERMISSION_DENIED", "Approval permission required");
    this.require(this.orders, companyId, orderId).approved = true;
  }
  stockEffect(companyId: string, orderId: string) {
    this.require(this.orders, companyId, orderId);
    return "0";
  }
  receive(
    companyId: string,
    input: {
      lineId: string;
      packageQuantity: string;
      batchNumber?: string;
      serialNumbers?: string[];
    },
  ) {
    const line = this.require(this.lines, companyId, input.lineId),
      base = FixedDecimal.parse(input.packageQuantity).multiply(line.conversion),
      pending = line.ordered.multiply(line.conversion).subtract(line.received);
    if (base.compare(pending) > 0)
      throw new PurchaseRuleError("RECEIPT_TOLERANCE_EXCEEDED", "Receipt exceeds pending quantity");
    if (line.tracking === "BATCH" && !input.batchNumber)
      throw new PurchaseRuleError("TRACKING_DATA_REQUIRED", "Batch number required");
    const serials = input.serialNumbers ?? [];
    if (line.tracking === "SERIAL") {
      if (FixedDecimal.parse(String(serials.length)).compare(base) !== 0)
        throw new PurchaseRuleError(
          "TRACKING_DATA_REQUIRED",
          "One serial is required per base unit",
        );
      for (const serial of serials) {
        const key = `${companyId}:${line.variantId}:${serial}`;
        if (this.serials.has(key))
          throw new PurchaseRuleError("DUPLICATE_SERIAL", "Serial already exists");
        this.serials.add(key);
      }
    }
    line.received = line.received.add(base);
    const row = {
      id: this.id(),
      companyId,
      kind: "PURCHASE_RECEIPT" as const,
      sourceId: line.orderId,
      variantId: line.variantId,
      quantity: base,
      ...(input.batchNumber ? { batch: input.batchNumber } : {}),
      serials,
    };
    this.ledger.push(row);
    return row;
  }
  pendingBase(companyId: string, lineId: string) {
    const l = this.require(this.lines, companyId, lineId);
    return l.ordered.multiply(l.conversion).subtract(l.received).toString();
  }
  returnGoods(companyId: string, lineId: string, packages: string) {
    const l = this.require(this.lines, companyId, lineId),
      base = FixedDecimal.parse(packages).multiply(l.conversion);
    if (base.compare(l.received.subtract(l.returned)) > 0)
      throw new PurchaseRuleError("RETURN_EXCEEDS_RECEIVED", "Return exceeds received stock");
    l.returned = l.returned.add(base);
    const row = {
      id: this.id(),
      companyId,
      kind: "PURCHASE_RETURN" as const,
      sourceId: l.orderId,
      variantId: l.variantId,
      quantity: base.negate(),
      serials: [],
    };
    this.ledger.push(row);
    return row;
  }
  matchInvoice(companyId: string, lineId: string, quantity: string, price: string) {
    const l = this.require(this.lines, companyId, lineId),
      issues: string[] = [];
    if (FixedDecimal.parse(quantity).compare(l.received.subtract(l.returned)) !== 0)
      issues.push("QUANTITY_MISMATCH");
    if (FixedDecimal.parse(price).compare(l.price) !== 0) issues.push("PRICE_MISMATCH");
    l.invoiced = l.invoiced.add(FixedDecimal.parse(quantity));
    return { status: issues.length ? "MISMATCH" : "MATCHED", issues };
  }
  allocateLandedCost(amount: string, quantities: string[]) {
    const total = FixedDecimal.parse(amount),
      weights = quantities.map((quantity) => FixedDecimal.parse(quantity)),
      sum = weights.reduce((a, b) => a.add(b), FixedDecimal.zero());
    if (sum.isZero()) throw new PurchaseRuleError("INVALID_ALLOCATION", "Basis must be positive");
    let used = FixedDecimal.zero();
    return weights.map((w, i) => {
      const share = i === weights.length - 1 ? total.subtract(used) : total.multiply(w).divide(sum);
      used = used.add(share);
      return share.toString();
    });
  }
  createInvoice(companyId: string, outstanding: string) {
    const id = this.id();
    this.invoices.set(id, { companyId, outstanding: FixedDecimal.parse(outstanding) });
    return id;
  }
  allocatePayment(companyId: string, id: string, amount: string) {
    const invoice = this.invoices.get(id);
    if (invoice?.companyId !== companyId)
      throw new PurchaseRuleError("RESOURCE_NOT_FOUND", "Invoice not found");
    const value = FixedDecimal.parse(amount);
    if (value.compare(invoice.outstanding) > 0)
      throw new PurchaseRuleError("PAYMENT_OVER_ALLOCATION", "Allocation exceeds outstanding");
    invoice.outstanding = invoice.outstanding.subtract(value);
    return invoice.outstanding.toString();
  }
  ledgerEntries(companyId: string) {
    return Object.freeze(
      this.ledger
        .filter((x) => x.companyId === companyId)
        .map((x) => Object.freeze({ ...x, quantity: x.quantity.toString() })),
    );
  }
  priceSnapshot(companyId: string, lineId: string) {
    return this.require(this.lines, companyId, lineId).price.toString();
  }
  private require<T extends Tenant>(rows: T[], companyId: string, id: string) {
    const row = rows.find((x) => x.id === id && x.companyId === companyId);
    if (!row) throw new PurchaseRuleError("RESOURCE_NOT_FOUND", "Resource not found");
    return row;
  }
  private id() {
    this.seq += 1;
    return `purchase-${this.seq.toString()}`;
  }
}
