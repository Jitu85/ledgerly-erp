"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SyntheticEvent } from "react";
import {
  Archive,
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  ReceiptText,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { getJson, postApi } from "@/lib/api";

const nav = [
  ["Dashboard", "/sales"],
  ["Customers", "/sales/customers"],
  ["Price lists", "/sales/price-lists"],
  ["Quotations", "/sales/quotations"],
  ["Orders", "/sales/orders"],
  ["Deliveries", "/sales/deliveries"],
  ["Invoices", "/sales/invoices"],
  ["Returns", "/sales/returns"],
  ["Credit notes", "/sales/credit-notes"],
  ["Payments", "/sales/payments"],
  ["Outstanding", "/sales/outstanding"],
] as const;

type Customer = {
  id: string;
  code: string;
  legalName: string;
  displayName: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  defaultCurrency: string;
  paymentTermsDays: number;
  creditLimit: string;
  status: string;
};

type SalesOrder = {
  id: string;
  referenceNumber: string;
  customerId: string;
  orderDate: string;
  currency: string;
  totalAmount: string;
  status: "DRAFT" | "CONFIRMED" | "APPROVED" | "CANCELLED" | "COMPLETED";
};

type Quotation = {
  id: string;
  referenceNumber: string;
  customerId: string;
  quotationDate: string;
  validUntil: string;
  currency: string;
  status: string;
};

type Delivery = {
  id: string;
  referenceNumber: string;
  salesOrderId: string;
  dispatchDate: string;
  status: string;
};

type PriceList = {
  id: string;
  code: string;
  name: string;
  currency: string;
  effectiveFrom: string;
  taxInclusive: boolean;
};

export function SalesScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <SalesOverview />;
  if (screenKey === "customers") return <CustomersScreen />;
  if (screenKey === "customers/new") return <CreateCustomerScreen />;
  if (screenKey === "orders") return <OrdersScreen />;
  if (screenKey === "quotations") return <QuotationsScreen />;
  if (screenKey === "price-lists") return <PriceListsScreen />;
  if (screenKey === "deliveries") return <DeliveriesScreen />;
  if (screenKey === "invoices") return <InvoicesScreen />;
  if (screenKey === "returns") return <ReturnsScreen />;
  if (screenKey === "credit-notes") return <CreditNotesScreen />;
  if (screenKey === "payments") return <PaymentsScreen />;
  if (screenKey === "outstanding") return <OutstandingScreen />;

  return <CustomersScreen />;
}

function SubNav({ current }: { current: string }) {
  return (
    <nav className="inventory-subnav" aria-label="Sales sections">
      {nav.map(([label, href]) => {
        const active = current === href || (href !== "/sales" && current.startsWith(href));
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SalesOverview() {
  const [counts, setCounts] = useState({ customers: 0, orders: 0, quotations: 0, deliveries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getJson<Customer[]>("/sales/customers"),
      getJson<SalesOrder[]>("/sales/orders"),
      getJson<Quotation[]>("/sales/quotations"),
      getJson<Delivery[]>("/sales/deliveries"),
    ]).then(([c, o, q, d]) => {
      if (!active) return;
      setCounts({
        customers: c.status === "fulfilled" && Array.isArray(c.value) ? c.value.length : 0,
        orders: o.status === "fulfilled" && Array.isArray(o.value) ? o.value.length : 0,
        quotations: q.status === "fulfilled" && Array.isArray(q.value) ? q.value.length : 0,
        deliveries: d.status === "fulfilled" && Array.isArray(d.value) ? d.value.length : 0,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    ["Customers", loading ? "..." : counts.customers.toString(), UsersRound],
    ["Sales Orders", loading ? "..." : counts.orders.toString(), ReceiptText],
    ["Active Quotations", loading ? "..." : counts.quotations.toString(), FileText],
    ["Deliveries Dispatched", loading ? "..." : counts.deliveries.toString(), Truck],
  ] as const;

  return (
    <div className="inventory-page">
      <SubNav current="/sales" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Revenue Operations</p>
          <h1>Sales & Order Fulfillment</h1>
          <p>
            Customer accounts, price lists, quotations, orders, delivery dispatches, and billing.
          </p>
        </div>
        <Link href="/sales/customers/new" className="button button-primary">
          <Plus size={18} />
          Create customer
        </Link>
      </div>

      <div className="metric-grid">
        {metrics.map(([label, value, Icon]) => (
          <section className="metric-card" key={label}>
            <span>
              <Icon size={19} />
            </span>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>Active company scope</small>
          </section>
        ))}
      </div>

      <div className="inventory-overview-grid">
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Fulfillment flow</p>
              <h2>Sales Order Cycle</h2>
            </div>
            <span className="status-chip status-chip-live">Active</span>
          </div>
          {[
            [
              "Customers & credit terms",
              counts.customers > 0 ? `${counts.customers.toString()} registered` : "Ready to add",
            ],
            [
              "Quotations & pricing",
              counts.quotations > 0 ? `${counts.quotations.toString()} active` : "Ready",
            ],
            [
              "Sales orders & reservations",
              counts.orders > 0 ? `${counts.orders.toString()} recorded` : "Ready",
            ],
            [
              "Delivery challan & dispatch",
              counts.deliveries > 0 ? `${counts.deliveries.toString()} posted` : "Ready",
            ],
          ].map(([label, status]) => (
            <div className="setup-row" key={label}>
              <CheckCircle2 size={18} color="#22c55e" />
              <span>{label}</span>
              <small>{status}</small>
            </div>
          ))}
        </section>

        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Commercial Controls</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Credit Limit & Terms Enforced</strong>
              <p>Customer credit checks are validated on sales order confirmation.</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Dispatch Deducts Stock Atomically</strong>
              <p>Delivery dispatch appends immutable sales-issue movements to the ledger.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void getJson<Customer[]>("/sales/customers")
      .then((data) => {
        if (active) {
          setCustomers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="inventory-page">
      <SubNav current="/sales/customers" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Customer master</p>
          <h1>Customers</h1>
          <p>Commercial clients, credit terms, tax identity, and pricing tiers.</p>
        </div>
        <Link className="button button-primary" href="/sales/customers/new">
          <Plus size={17} />
          New customer
        </Link>
      </div>

      <section className="inventory-panel table-panel">
        <div className="list-toolbar">
          <label className="search-control">
            <Search size={17} />
            <span className="sr-only">Search</span>
            <input
              placeholder="Search customers by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Customer Name</th>
                <th scope="col">Payment Terms</th>
                <th scope="col">Credit Limit</th>
                <th scope="col">Currency</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No customers registered in this company.</p>
                    <Link
                      href="/sales/customers/new"
                      className="button button-secondary"
                      style={{ marginTop: "12px", display: "inline-flex" }}
                    >
                      <Plus size={16} /> Create first customer
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code>{c.code}</code>
                    </td>
                    <td>
                      <strong>{c.displayName || c.legalName}</strong>
                    </td>
                    <td>
                      {c.paymentTermsDays ? `${c.paymentTermsDays.toString()} days` : "Immediate"}
                    </td>
                    <td>{c.creditLimit}</td>
                    <td>{c.defaultCurrency}</td>
                    <td>
                      <span className="status-chip status-chip-live">Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function CreateCustomerScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [taxReg, setTaxReg] = useState("");
  const [terms, setTerms] = useState(30);
  const [creditLimit, setCreditLimit] = useState("100000");
  const [currency, setCurrency] = useState("USD");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!code || !legalName) {
      setError("Customer code and legal business name are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/sales/customers", {
        code: code.trim().toUpperCase(),
        legalName: legalName.trim(),
        displayName: displayName.trim() || legalName.trim(),
        taxRegistrationNumber: taxReg.trim() || undefined,
        paymentTermsDays: terms,
        creditLimit: creditLimit.trim() || "0",
        defaultCurrency: currency.trim().toUpperCase(),
        email: email.trim() || undefined,
        mobileNumber: phone.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
      });
      router.push("/sales/customers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/sales/customers" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Customer setup</p>
          <h1>Create customer</h1>
          <p>
            Register a client entity with credit terms and tax credentials in this company scope.
          </p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Client profile</p>
            <h2>Customer Information</h2>
          </div>
          <span className="status-chip">Master data</span>
        </div>

        {error ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <div>
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <form className="inventory-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Customer Code *</span>
            <input
              className="input"
              required
              placeholder="e.g. CUST-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Legal Business Name *</span>
            <input
              className="input"
              required
              placeholder="e.g. Orion Retail Solutions Inc."
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Display Name</span>
            <input
              className="input"
              placeholder="e.g. Orion Stores"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Tax / GSTIN Number</span>
            <input
              className="input"
              placeholder="Tax ID"
              value={taxReg}
              onChange={(e) => setTaxReg(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Payment Terms (Days)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={terms}
              onChange={(e) => setTerms(Number.parseInt(e.target.value, 10) || 0)}
            />
          </label>

          <label className="field">
            <span className="field-label">Credit Limit</span>
            <input
              className="input"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Default Currency</span>
            <input
              className="input"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </label>

          <label className="field">
            <span className="field-label">Contact Person</span>
            <input
              className="input"
              placeholder="e.g. Michael Scott"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Email Address</span>
            <input
              className="input"
              type="email"
              placeholder="orders@customer.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Phone Number</span>
            <input
              className="input"
              placeholder="+1-555-0200"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => router.push("/sales/customers")}
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Customer"}
            </button>
          </div>
        </form>
      </section>

      <AuditFooter />
    </div>
  );
}

function OrdersScreen() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [refNo, setRefNo] = useState(`SO-${new Date().getFullYear().toString()}-001`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState("USD");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("5");
  const [unitPrice, setUnitPrice] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadOrders() {
    void getJson<SalesOrder[]>("/sales/orders")
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
    void getJson<Customer[]>("/sales/customers").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setCustomers(data);
        setCustomerId(data[0].id);
      }
    });
  }, []);

  async function handleCreateOrder(e: SyntheticEvent) {
    e.preventDefault();
    if (!customerId || !refNo || !variantId || !quantity || !unitPrice) {
      setError("Please fill all required sales order line fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/sales/orders", {
        customerId,
        referenceNumber: refNo.trim(),
        orderDate,
        currency: currency.toUpperCase(),
        lines: [
          {
            variantId: variantId.trim(),
            packageQuantity: quantity.trim(),
            conversionSnapshot: "1",
            packageUnitPrice: unitPrice.trim(),
            warehouseId: "00000000-0000-0000-0000-000000000000",
          },
        ],
      });
      setShowCreate(false);
      loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create sales order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(orderId: string) {
    try {
      await postApi(`/sales/orders/${orderId}/action`, {
        status: "APPROVED",
        reason: "Commercial approval confirmed",
      });
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve sales order");
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/sales/orders" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Sales transactions</p>
          <h1>Sales Orders</h1>
          <p>Confirmed customer orders with inventory reservation and delivery fulfillment.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={17} />
          {showCreate ? "Close Form" : "Create order"}
        </button>
      </div>

      {showCreate ? (
        <section className="inventory-panel entry-panel" style={{ marginBottom: "24px" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New SO</p>
              <h2>Create Sales Order</h2>
            </div>
          </div>
          {error ? (
            <div
              className="signal-row"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
            >
              <div>
                <strong>Error</strong>
                <p>{error}</p>
              </div>
            </div>
          ) : null}
          <form className="inventory-form" onSubmit={handleCreateOrder}>
            <label className="field">
              <span className="field-label">Reference Number *</span>
              <input
                className="input"
                required
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Customer *</span>
              {customers.length > 0 ? (
                <select
                  className="input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.legalName} ({c.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="Customer UUID"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              )}
            </label>
            <label className="field">
              <span className="field-label">Order Date *</span>
              <input
                className="input"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Currency *</span>
              <input
                className="input"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Variant UUID *</span>
              <input
                className="input"
                placeholder="Product Variant UUID"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Quantity *</span>
              <input
                className="input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Selling Unit Price *</span>
              <input
                className="input"
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Sales Order"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">SO Number</th>
                <th scope="col">Date</th>
                <th scope="col">Currency</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    Loading sales orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No sales orders found.</p>
                  </td>
                </tr>
              ) : (
                orders.map((so) => (
                  <tr key={so.id}>
                    <td>
                      <code>{so.referenceNumber}</code>
                    </td>
                    <td>{new Date(so.orderDate).toLocaleDateString()}</td>
                    <td>{so.currency}</td>
                    <td>
                      <span
                        className={`status-chip ${
                          so.status === "APPROVED"
                            ? "status-chip-live"
                            : so.status === "CONFIRMED"
                              ? "status-chip-warning"
                              : ""
                        }`}
                      >
                        {so.status}
                      </span>
                    </td>
                    <td>
                      {so.status !== "APPROVED" && so.status !== "COMPLETED" ? (
                        <button
                          className="button button-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          type="button"
                          onClick={() => handleApprove(so.id)}
                        >
                          Approve Order
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Approved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function QuotationsScreen() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<Quotation[]>("/sales/quotations")
      .then((data) => {
        if (active) {
          setQuotations(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="inventory-page">
      <SubNav current="/sales/quotations" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Price negotiation</p>
          <h1>Sales Quotations</h1>
          <p>Commercial price quotes issued to customers prior to sales order confirmation.</p>
        </div>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Quote No.</th>
                <th scope="col">Date</th>
                <th scope="col">Valid Until</th>
                <th scope="col">Currency</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No sales quotations active.</p>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <code>{q.referenceNumber}</code>
                    </td>
                    <td>{new Date(q.quotationDate).toLocaleDateString()}</td>
                    <td>{new Date(q.validUntil).toLocaleDateString()}</td>
                    <td>{q.currency}</td>
                    <td>
                      <span className="status-chip status-chip-live">{q.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function PriceListsScreen() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<PriceList[]>("/sales/price-lists")
      .then((data) => {
        if (active) {
          setLists(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="inventory-page">
      <SubNav current="/sales/price-lists" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Pricing governance</p>
          <h1>Price Lists</h1>
          <p>Tiered price lists and custom customer pricing agreements.</p>
        </div>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Price List Name</th>
                <th scope="col">Currency</th>
                <th scope="col">Effective From</th>
                <th scope="col">Tax Inclusive</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    Loading price lists...
                  </td>
                </tr>
              ) : lists.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No custom price lists registered.</p>
                  </td>
                </tr>
              ) : (
                lists.map((pl) => (
                  <tr key={pl.id}>
                    <td>
                      <code>{pl.code}</code>
                    </td>
                    <td>
                      <strong>{pl.name}</strong>
                    </td>
                    <td>{pl.currency}</td>
                    <td>{new Date(pl.effectiveFrom).toLocaleDateString()}</td>
                    <td>{pl.taxInclusive ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<Delivery[]>("/sales/deliveries")
      .then((data) => {
        if (active) {
          setDeliveries(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="inventory-page">
      <SubNav current="/sales/deliveries" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Outbound logistics</p>
          <h1>Deliveries & Dispatches</h1>
          <p>Delivery challans deducting physical stock and confirming carrier handoffs.</p>
        </div>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Challan No.</th>
                <th scope="col">Dispatch Date</th>
                <th scope="col">Sales Order ID</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No delivery dispatches recorded.</p>
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <code>{d.referenceNumber}</code>
                    </td>
                    <td>{new Date(d.dispatchDate).toLocaleDateString()}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {d.salesOrderId}
                    </td>
                    <td>
                      <span className="status-chip status-chip-live">{d.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function InvoicesScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/sales/invoices" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Receivables</p>
          <h1>Sales Invoices</h1>
          <p>Commercial invoices issued to customers reflecting dispatched goods.</p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <Receipt size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Sales Invoicing Endpoint Ready</h3>
          <p style={{ color: "var(--muted)" }}>
            Invoices can be generated directly from confirmed sales orders or delivery challans via{" "}
            <code>/api/v1/sales/invoices</code>.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function ReturnsScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/sales/returns" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Customer returns</p>
          <h1>Sales Returns</h1>
          <p>Customer returned goods inspected and returned to warehouse stock or quarantine.</p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <Truck size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Customer Return Processing Active</h3>
          <p style={{ color: "var(--muted)" }}>
            Generates return inspection ledger entries and initiates credit notes automatically.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function CreditNotesScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/sales/credit-notes" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Customer credits</p>
          <h1>Credit Notes</h1>
          <p>
            Adjust customer billing and reverse revenue for returns, discounts, or rate disputes.
          </p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <FileText size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Credit Note Management Active</h3>
          <p style={{ color: "var(--muted)" }}>
            Credit notes link to original sales invoices and reduce open receivable balances.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function PaymentsScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/sales/payments" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Cash collection</p>
          <h1>Customer Payments</h1>
          <p>
            Record customer receipts and settle invoices via cash, cheque, or electronic transfer.
          </p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <CreditCard size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Customer Payment Processing Ready</h3>
          <p style={{ color: "var(--muted)" }}>
            Posts balanced journal entries debiting bank accounts and crediting accounts receivable.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function OutstandingScreen() {
  const [data, setData] = useState<{ customersCount?: number; totalOutstanding?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<{ customersCount?: number; totalOutstanding?: string }>("/sales/outstanding")
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="inventory-page">
      <SubNav current="/sales/outstanding" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Aging analysis</p>
          <h1>Accounts Receivable Aging</h1>
          <p>Real-time customer outstanding balances and payment performance tracking.</p>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: "24px" }}>
        <section className="metric-card">
          <span>
            <WalletCards size={19} />
          </span>
          <p>Customers with Outstanding</p>
          <strong>{loading ? "..." : (data?.customersCount ?? "0")}</strong>
          <small>Open invoices</small>
        </section>
        <section className="metric-card">
          <span>
            <BadgeIndianRupee size={19} />
          </span>
          <p>Total Outstanding Balance</p>
          <strong>{loading ? "..." : (data?.totalOutstanding ?? "0.00")}</strong>
          <small>Unsettled receivables</small>
        </section>
      </div>

      <AuditFooter />
    </div>
  );
}

function AuditFooter() {
  return (
    <aside className="audit-note">
      <ShieldCheck size={18} />
      <div>
        <strong>Commercial Governance & Row-Level Security Active</strong>
        <p>
          Customer data, pricing, and orders are isolated strictly to your active company.
          Dispatches directly alter physical stock through the immutable ledger.
        </p>
      </div>
    </aside>
  );
}
