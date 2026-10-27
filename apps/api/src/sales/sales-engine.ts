import { FixedDecimal } from "../inventory/decimal.js";
export type SalesTrackingMode = "NONE" | "BATCH" | "SERIAL";
type Tenant = { id: string; companyId: string };
type Customer = Tenant & {
  creditLimit: FixedDecimal;
  outstanding: FixedDecimal;
  credits: FixedDecimal;
};
type OrderLine = Tenant & {
  orderId: string;
  variantId: string;
  packages: FixedDecimal;
  conversion: FixedDecimal;
  price: FixedDecimal;
  reserved: FixedDecimal;
  dispatched: FixedDecimal;
  returned: FixedDecimal;
  invoiced: FixedDecimal;
  tracking: SalesTrackingMode;
};
type Ledger = Tenant & {
  kind: "SALES_DISPATCH" | "SALES_RETURN";
  sourceId: string;
  variantId: string;
  quantity: FixedDecimal;
  batch?: string;
  serials: string[];
};
export class SalesRuleError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export class SalesEngine {
  private seq = 0;
  private customers: Customer[] = [];
  private quotations: Tenant[] = [];
  private orders: (Tenant & { approved: boolean })[] = [];
  private lines: OrderLine[] = [];
  private ledger: Ledger[] = [];
  private stock = new Map<string, FixedDecimal>();
  private issuedSerials = new Set<string>();
  private invoices = new Map<
    string,
    { companyId: string; outstanding: FixedDecimal; dispatchId?: string }
  >();
  createCustomer(companyId: string, creditLimit = "0") {
    const row = {
      id: this.id(),
      companyId,
      creditLimit: FixedDecimal.parse(creditLimit),
      outstanding: FixedDecimal.zero(),
      credits: FixedDecimal.zero(),
    };
    this.customers.push(row);
    return row;
  }
  getCustomer(companyId: string, id: string) {
    return this.require(this.customers, companyId, id);
  }
  setStock(companyId: string, variantId: string, quantity: string) {
    this.stock.set(`${companyId}:${variantId}`, FixedDecimal.parse(quantity));
  }
  createQuotation(companyId: string) {
    const row = { id: this.id(), companyId };
    this.quotations.push(row);
    return row;
  }
  quotationStockEffect(companyId: string, id: string) {
    this.require(this.quotations, companyId, id);
    return "0";
  }
  createOrder(
    companyId: string,
    input: {
      customerId: string;
      variantId: string;
      packageQuantity: string;
      conversion: string;
      packagePrice: string;
      tracking?: SalesTrackingMode;
    },
  ) {
    this.getCustomer(companyId, input.customerId);
    const order = { id: this.id(), companyId, approved: false };
    this.orders.push(order);
    const line = {
      id: this.id(),
      companyId,
      orderId: order.id,
      variantId: input.variantId,
      packages: FixedDecimal.parse(input.packageQuantity),
      conversion: FixedDecimal.parse(input.conversion),
      price: FixedDecimal.parse(input.packagePrice),
      reserved: FixedDecimal.zero(),
      dispatched: FixedDecimal.zero(),
      returned: FixedDecimal.zero(),
      invoiced: FixedDecimal.zero(),
      tracking: input.tracking ?? "NONE",
    };
    this.lines.push(line);
    return { order, line };
  }
  orderStockEffect(companyId: string, id: string) {
    this.require(this.orders, companyId, id);
    return "0";
  }
  approve(companyId: string, orderId: string, customerId: string, permissions: Set<string>) {
    if (!permissions.has("sales.orders.approve"))
      throw new SalesRuleError("PERMISSION_DENIED", "Approval permission required");
    const order = this.require(this.orders, companyId, orderId),
      customer = this.getCustomer(companyId, customerId);
    const exposure = customer.outstanding
      .add(this.orderValue(companyId, orderId))
      .subtract(customer.credits);
    if (exposure.compare(customer.creditLimit) > 0 && !permissions.has("sales.credit.override"))
      throw new SalesRuleError("CREDIT_LIMIT_EXCEEDED", "Credit approval required");
    order.approved = true;
    return exposure.toString();
  }
  reserve(companyId: string, lineId: string, packages: string) {
    const line = this.require(this.lines, companyId, lineId),
      base = FixedDecimal.parse(packages).multiply(line.conversion),
      available = this.available(companyId, line.variantId);
    if (base.compare(available) > 0)
      throw new SalesRuleError(
        "INSUFFICIENT_AVAILABLE_STOCK",
        "Reservation exceeds available stock",
      );
    line.reserved = line.reserved.add(base);
    return base.toString();
  }
  physical(companyId: string, variantId: string) {
    return (this.stock.get(`${companyId}:${variantId}`) ?? FixedDecimal.zero()).toString();
  }
  reserved(companyId: string, variantId: string) {
    return this.lines
      .filter((x) => x.companyId === companyId && x.variantId === variantId)
      .reduce((n, x) => n.add(x.reserved), FixedDecimal.zero())
      .toString();
  }
  available(companyId: string, variantId: string) {
    return FixedDecimal.parse(this.physical(companyId, variantId)).subtract(
      FixedDecimal.parse(this.reserved(companyId, variantId)),
    );
  }
  dispatch(
    companyId: string,
    input: {
      lineId: string;
      packageQuantity: string;
      batchNumber?: string;
      serialNumbers?: string[];
    },
  ) {
    const line = this.require(this.lines, companyId, input.lineId),
      order = this.require(this.orders, companyId, line.orderId);
    if (!order.approved)
      throw new SalesRuleError("INVALID_WORKFLOW_STATE", "Approved order required");
    const base = FixedDecimal.parse(input.packageQuantity).multiply(line.conversion),
      pending = line.packages.multiply(line.conversion).subtract(line.dispatched);
    if (base.compare(pending) > 0)
      throw new SalesRuleError("DISPATCH_EXCEEDS_ORDER", "Dispatch exceeds pending quantity");
    if (line.tracking === "BATCH" && !input.batchNumber)
      throw new SalesRuleError("TRACKING_DATA_REQUIRED", "Batch required");
    const serials = input.serialNumbers ?? [];
    if (line.tracking === "SERIAL") {
      if (FixedDecimal.parse(String(serials.length)).compare(base) !== 0)
        throw new SalesRuleError("TRACKING_DATA_REQUIRED", "One serial per base unit required");
      for (const serial of serials) {
        const key = `${companyId}:${line.variantId}:${serial}`;
        if (this.issuedSerials.has(key))
          throw new SalesRuleError("SERIAL_UNAVAILABLE", "Serial unavailable");
        this.issuedSerials.add(key);
      }
    }
    const physical = FixedDecimal.parse(this.physical(companyId, line.variantId));
    if (base.compare(physical) > 0)
      throw new SalesRuleError("INSUFFICIENT_STOCK", "Negative stock blocked");
    this.stock.set(`${companyId}:${line.variantId}`, physical.subtract(base));
    line.dispatched = line.dispatched.add(base);
    line.reserved =
      line.reserved.compare(base) >= 0 ? line.reserved.subtract(base) : FixedDecimal.zero();
    const row = {
      id: this.id(),
      companyId,
      kind: "SALES_DISPATCH" as const,
      sourceId: line.orderId,
      variantId: line.variantId,
      quantity: base.negate(),
      ...(input.batchNumber ? { batch: input.batchNumber } : {}),
      serials,
    };
    this.ledger.push(row);
    return row;
  }
  pendingBase(companyId: string, lineId: string) {
    const line = this.require(this.lines, companyId, lineId);
    return line.packages.multiply(line.conversion).subtract(line.dispatched).toString();
  }
  immediateInvoice(companyId: string, lineId: string, packages: string, idempotencyKey: string) {
    const existing = this.invoices.get(idempotencyKey);
    if (existing) {
      if (existing.companyId !== companyId)
        throw new SalesRuleError("RESOURCE_NOT_FOUND", "Invoice not found");
      return existing;
    }
    const movement = this.dispatch(companyId, { lineId, packageQuantity: packages });
    const invoice = {
      companyId,
      outstanding: FixedDecimal.parse(packages),
      dispatchId: movement.id,
    };
    this.invoices.set(idempotencyKey, invoice);
    return invoice;
  }
  returnGoods(companyId: string, lineId: string, packages: string) {
    const line = this.require(this.lines, companyId, lineId),
      base = FixedDecimal.parse(packages).multiply(line.conversion);
    if (base.compare(line.dispatched.subtract(line.returned)) > 0)
      throw new SalesRuleError("RETURN_EXCEEDS_DISPATCH", "Return exceeds dispatch");
    line.returned = line.returned.add(base);
    const physical = FixedDecimal.parse(this.physical(companyId, line.variantId));
    this.stock.set(`${companyId}:${line.variantId}`, physical.add(base));
    const row = {
      id: this.id(),
      companyId,
      kind: "SALES_RETURN" as const,
      sourceId: line.orderId,
      variantId: line.variantId,
      quantity: base,
      serials: [],
    };
    this.ledger.push(row);
    return row;
  }
  createInvoice(companyId: string, customerId: string, outstanding: string) {
    const customer = this.getCustomer(companyId, customerId),
      id = this.id(),
      amount = FixedDecimal.parse(outstanding);
    this.invoices.set(id, { companyId, outstanding: amount });
    customer.outstanding = customer.outstanding.add(amount);
    return id;
  }
  allocatePayment(companyId: string, id: string, amount: string) {
    const invoice = this.invoices.get(id);
    if (invoice?.companyId !== companyId)
      throw new SalesRuleError("RESOURCE_NOT_FOUND", "Invoice not found");
    const value = FixedDecimal.parse(amount);
    if (value.compare(invoice.outstanding) > 0)
      throw new SalesRuleError("PAYMENT_OVER_ALLOCATION", "Allocation exceeds outstanding");
    invoice.outstanding = invoice.outstanding.subtract(value);
    return invoice.outstanding.toString();
  }
  priceSnapshot(companyId: string, lineId: string) {
    return this.require(this.lines, companyId, lineId).price.toString();
  }
  ledgerEntries(companyId: string) {
    return Object.freeze(
      this.ledger
        .filter((x) => x.companyId === companyId)
        .map((x) => Object.freeze({ ...x, quantity: x.quantity.toString() })),
    );
  }
  private orderValue(companyId: string, orderId: string) {
    return this.lines
      .filter((x) => x.companyId === companyId && x.orderId === orderId)
      .reduce((n, x) => n.add(x.packages.multiply(x.price)), FixedDecimal.zero());
  }
  private require<T extends Tenant>(rows: T[], companyId: string, id: string) {
    const row = rows.find((x) => x.id === id && x.companyId === companyId);
    if (!row) throw new SalesRuleError("RESOURCE_NOT_FOUND", "Resource not found");
    return row;
  }
  private id() {
    this.seq++;
    return `sales-${this.seq.toString()}`;
  }
}
