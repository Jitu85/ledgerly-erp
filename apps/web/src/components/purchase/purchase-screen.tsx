"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SyntheticEvent } from "react";
import {
  Archive,
  Boxes,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { getJson, postApi } from "@/lib/api";
import { PurchaseActionButton } from "./purchase-action-button";

const nav = [
  ["Dashboard", "/purchases"],
  ["Suppliers", "/purchases/suppliers"],
  ["Requisitions", "/purchases/requisitions"],
  ["Orders", "/purchases/orders"],
  ["Receipts", "/purchases/receipts"],
  ["Invoices", "/purchases/invoices"],
  ["Returns", "/purchases/returns"],
  ["Landed costs", "/purchases/landed-costs"],
  ["Payments", "/purchases/payments"],
] as const;

type Supplier = {
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

type PurchaseOrder = {
  id: string;
  referenceNumber: string;
  supplierId: string;
  orderDate: string;
  currency: string;
  totalAmount: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
};

type Requisition = {
  id: string;
  referenceNumber: string;
  businessDate: string;
  warehouseId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
};

export function PurchaseScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <PurchaseOverview />;
  if (screenKey === "suppliers") return <SuppliersScreen />;
  if (screenKey === "suppliers/new") return <CreateSupplierScreen />;
  if (screenKey === "orders") return <OrdersScreen />;
  if (screenKey === "requisitions") return <RequisitionsScreen />;
  if (screenKey === "receipts") return <GoodsReceiptScreen />;
  if (screenKey === "invoices") return <PurchaseInvoiceScreen />;
  if (screenKey === "returns") return <PurchaseReturnScreen />;
  if (screenKey === "landed-costs") return <LandedCostsScreen />;
  if (screenKey === "payments") return <PaymentsScreen />;

  return <SuppliersScreen />;
}

function SubNav({ current }: { current: string }) {
  return (
    <nav className="inventory-subnav" aria-label="Purchase sections">
      {nav.map(([label, href]) => {
        const active = current === href || (href !== "/purchases" && current.startsWith(href));
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function PurchaseOverview() {
  const [counts, setCounts] = useState({ suppliers: 0, orders: 0, requisitions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getJson<Supplier[]>("/purchase/suppliers"),
      getJson<PurchaseOrder[]>("/purchase/orders"),
      getJson<Requisition[]>("/purchase/requisitions"),
    ]).then(([s, o, r]) => {
      if (!active) return;
      setCounts({
        suppliers: s.status === "fulfilled" && Array.isArray(s.value) ? s.value.length : 0,
        orders: o.status === "fulfilled" && Array.isArray(o.value) ? o.value.length : 0,
        requisitions: r.status === "fulfilled" && Array.isArray(r.value) ? r.value.length : 0,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    ["Active Suppliers", loading ? "..." : counts.suppliers.toString(), Building2],
    ["Purchase Orders", loading ? "..." : counts.orders.toString(), ReceiptText],
    ["Requisitions", loading ? "..." : counts.requisitions.toString(), FileText],
    ["Receipts Posted", "0", PackageCheck],
  ] as const;

  return (
    <div className="inventory-page">
      <SubNav current="/purchases" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Procurement Operations</p>
          <h1>Purchases & Vendor Management</h1>
          <p>
            Tenant-safe supplier lifecycle, commercial PO approval workflow, and goods receiving.
          </p>
        </div>
        <Link href="/purchases/suppliers/new" className="button button-primary">
          <Plus size={18} />
          Create supplier
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
              <p className="eyebrow">Workflow state</p>
              <h2>Procurement Pipeline</h2>
            </div>
            <span className="status-chip status-chip-live">Active</span>
          </div>
          {[
            [
              "Suppliers & commercial terms",
              counts.suppliers > 0 ? `${counts.suppliers.toString()} active` : "Ready to add",
            ],
            [
              "Purchase requisitions",
              counts.requisitions > 0 ? `${counts.requisitions.toString()} created` : "Ready",
            ],
            [
              "Purchase orders & approvals",
              counts.orders > 0 ? `${counts.orders.toString()} created` : "Ready",
            ],
            ["Goods receipt & matching", "Ready to receive"],
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
              <h2>Procurement Controls</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Strict Separation of Duties</strong>
              <p>Requisition approval and order approval require audited sign-off.</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Goods Receipts append to Stock Ledger</strong>
              <p>Receiving inventory creates immutable stock movements automatically.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void getJson<Supplier[]>("/purchase/suppliers")
      .then((data) => {
        if (active) {
          setSuppliers(Array.isArray(data) ? data : []);
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

  const filtered = suppliers.filter(
    (s) =>
      s.legalName.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="inventory-page">
      <SubNav current="/purchases/suppliers" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Supplier master</p>
          <h1>Suppliers</h1>
          <p>Company-specific vendors, terms, tax identity, and purchasing status.</p>
        </div>
        <Link className="button button-primary" href="/purchases/suppliers/new">
          <Plus size={17} />
          New supplier
        </Link>
      </div>

      <section className="inventory-panel table-panel">
        <div className="list-toolbar">
          <label className="search-control">
            <Search size={17} />
            <span className="sr-only">Search</span>
            <input
              placeholder="Search suppliers by name or code..."
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
                <th scope="col">Supplier Name</th>
                <th scope="col">Terms</th>
                <th scope="col">Credit Limit</th>
                <th scope="col">Currency</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No suppliers registered in this company.</p>
                    <Link
                      href="/purchases/suppliers/new"
                      className="button button-secondary"
                      style={{ marginTop: "12px", display: "inline-flex" }}
                    >
                      <Plus size={16} /> Create first supplier
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code>{s.code}</code>
                    </td>
                    <td>
                      <strong>{s.displayName || s.legalName}</strong>
                    </td>
                    <td>
                      {s.paymentTermsDays ? `${s.paymentTermsDays.toString()} days` : "Immediate"}
                    </td>
                    <td>{s.creditLimit}</td>
                    <td>{s.defaultCurrency}</td>
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

function CreateSupplierScreen() {
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
      setError("Supplier code and legal business name are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/purchase/suppliers", {
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
      router.push("/purchases/suppliers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/purchases/suppliers" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Supplier setup</p>
          <h1>Create supplier</h1>
          <p>Register the legal and commercial supplier entity in this tenant.</p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Vendor profile</p>
            <h2>Supplier Information</h2>
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
            <span className="field-label">Supplier Code *</span>
            <input
              className="input"
              required
              placeholder="e.g. SUP-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Legal Business Name *</span>
            <input
              className="input"
              required
              placeholder="e.g. Apex Industrial Supplies Ltd."
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Display Name</span>
            <input
              className="input"
              placeholder="e.g. Apex Supplies"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Tax / GSTIN Number</span>
            <input
              className="input"
              placeholder="Tax registration ID"
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
              placeholder="e.g. Jane Doe"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Email Address</span>
            <input
              className="input"
              type="email"
              placeholder="supplier@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Phone Number</span>
            <input
              className="input"
              placeholder="+1-555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => router.push("/purchases/suppliers")}
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Supplier"}
            </button>
          </div>
        </form>
      </section>

      <AuditFooter />
    </div>
  );
}

function OrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [refNo, setRefNo] = useState(`PO-${new Date().getFullYear().toString()}-001`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState("USD");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [unitPrice, setUnitPrice] = useState("25");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadOrders() {
    void getJson<PurchaseOrder[]>("/purchase/orders")
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
    void getJson<Supplier[]>("/purchase/suppliers").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setSuppliers(data);
        setSupplierId(data[0].id);
      }
    });
  }, []);

  async function handleCreateOrder(e: SyntheticEvent) {
    e.preventDefault();
    if (!supplierId || !refNo || !variantId || !quantity || !unitPrice) {
      setError("Please fill all required order line fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/purchase/orders", {
        supplierId,
        referenceNumber: refNo.trim(),
        orderDate,
        currency: currency.toUpperCase(),
        lines: [
          {
            variantId: variantId.trim(),
            packageQuantity: quantity.trim(),
            conversionSnapshot: "1",
            packageUnitPrice: unitPrice.trim(),
            warehouseId: "00000000-0000-0000-0000-000000000000", // system placeholder
          },
        ],
      });
      setShowCreate(false);
      loadOrders();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(orderId: string) {
    try {
      await postApi(`/purchase/orders/${orderId}/decision`, {
        decision: "APPROVED",
        reason: "Commercial approval granted",
      });
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve order");
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/purchases/orders" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Purchase transactions</p>
          <h1>Purchase Orders</h1>
          <p>
            Legally binding purchase orders submitted to suppliers with versioned approval tracking.
          </p>
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
              <p className="eyebrow">New PO</p>
              <h2>Create Purchase Order</h2>
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
              <span className="field-label">Supplier *</span>
              {suppliers.length > 0 ? (
                <select
                  className="input"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName || s.legalName} ({s.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="Supplier UUID"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
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
              <span className="field-label">Unit Price *</span>
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
                {submitting ? "Creating..." : "Save Purchase Order"}
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
                <th scope="col">PO Number</th>
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
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No purchase orders found.</p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id}>
                    <td>
                      <code>{po.referenceNumber}</code>
                    </td>
                    <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td>{po.currency}</td>
                    <td>
                      <span
                        className={`status-chip ${
                          po.status === "APPROVED"
                            ? "status-chip-live"
                            : po.status === "SUBMITTED"
                              ? "status-chip-warning"
                              : ""
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td>
                      {po.status === "DRAFT" || po.status === "SUBMITTED" ? (
                        <button
                          className="button button-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          type="button"
                          onClick={() => handleApprove(po.id)}
                        >
                          Approve PO
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

function RequisitionsScreen() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<Requisition[]>("/purchase/requisitions")
      .then((data) => {
        if (active) {
          setRequisitions(Array.isArray(data) ? data : []);
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
      <SubNav current="/purchases/requisitions" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Internal demand</p>
          <h1>Purchase Requisitions</h1>
          <p>Departmental requests for materials converted into approved purchase orders.</p>
        </div>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Requisition No.</th>
                <th scope="col">Business Date</th>
                <th scope="col">Warehouse</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    Loading requisitions...
                  </td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No purchase requisitions pending.</p>
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <code>{req.referenceNumber}</code>
                    </td>
                    <td>{new Date(req.businessDate).toLocaleDateString()}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {req.warehouseId}
                    </td>
                    <td>
                      <span className="status-chip">{req.status}</span>
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

function GoodsReceiptScreen() {
  const [poId, setPoId] = useState("");
  const [refNo, setRefNo] = useState(`GRN-${new Date().getFullYear().toString()}-001`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [poLineId, setPoLineId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [warehouseId, setWarehouseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handlePostReceipt() {
    if (!poId || !refNo || !poLineId || !quantity || !warehouseId) {
      setError("Please complete all Goods Receipt fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/purchase/goods-receipts/post", {
        purchaseOrderId: poId.trim(),
        referenceNumber: refNo.trim(),
        receiptDate,
        lines: [
          {
            purchaseOrderLineId: poLineId.trim(),
            packageQuantity: quantity.trim(),
            warehouseId: warehouseId.trim(),
          },
        ],
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post goods receipt");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/purchases/receipts" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Physical receiving</p>
          <h1>Goods Receipts (GRN)</h1>
          <p>
            Receive verified deliveries from approved purchase orders into the immutable stock
            ledger.
          </p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Warehouse receiving</p>
            <h2>Post Goods Receipt Note</h2>
          </div>
          <span className="status-chip status-chip-live">Stock Posting</span>
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

        {success ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderColor: "#22c55e" }}
          >
            <div>
              <strong>Success</strong>
              <p>Goods receipt posted successfully and appended to immutable stock ledger.</p>
            </div>
          </div>
        ) : null}

        <div className="inventory-form">
          <label className="field">
            <span className="field-label">GRN Reference Number *</span>
            <input className="input" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Receipt Date *</span>
            <input
              className="input"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Purchase Order UUID *</span>
            <input
              className="input"
              placeholder="PO UUID"
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">PO Line UUID *</span>
            <input
              className="input"
              placeholder="PO Line UUID"
              value={poLineId}
              onChange={(e) => setPoLineId(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Received Quantity *</span>
            <input
              className="input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Receiving Warehouse UUID *</span>
            <input
              className="input"
              placeholder="Warehouse UUID"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            />
          </label>
        </div>

        <div className="form-actions">
          <PurchaseActionButton
            label="Confirm and Post GRN"
            effect="Posting appends immutable stock-ledger receiving movements and creates matching reconciliation records."
            onConfirm={handlePostReceipt}
            loading={submitting}
          />
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function PurchaseInvoiceScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/purchases/invoices" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Financial reconciliation</p>
          <h1>Purchase Invoices</h1>
          <p>Match supplier bills against purchase orders and posted goods receipts.</p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <FileText size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Purchase Invoice Matching Ready</h3>
          <p style={{ color: "var(--muted)" }}>
            Invoices can be created and matched via the <code>/api/v1/purchase/invoices</code>{" "}
            endpoint.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function PurchaseReturnScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/purchases/returns" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Vendor returns</p>
          <h1>Purchase Returns</h1>
          <p>
            Return defective or surplus goods back to vendors with negative stock-ledger posting.
          </p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <Truck size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Purchase Return Processing Active</h3>
          <p style={{ color: "var(--muted)" }}>
            Purchase return entries link directly to verified GRNs and debit supplier accounts.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function LandedCostsScreen() {
  return (
    <div className="inventory-page">
      <SubNav current="/purchases/landed-costs" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Cost absorption</p>
          <h1>Landed Costs</h1>
          <p>Allocate freight, customs, and handling charges into inventory valuation.</p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <Boxes size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Landed Cost Capitalization Active</h3>
          <p style={{ color: "var(--muted)" }}>
            Supports QUANTITY, ITEM_VALUE, and WEIGHT allocation methods across receipt batches.
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
      <SubNav current="/purchases/payments" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Cash outflow</p>
          <h1>Supplier Payments</h1>
          <p>Record vendor disbursements and allocate against outstanding purchase invoices.</p>
        </div>
      </div>
      <section className="inventory-panel table-panel">
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <WalletCards size={28} style={{ margin: "0 auto 12px" }} />
          <h3>Supplier Payment Settlement Ready</h3>
          <p style={{ color: "var(--muted)" }}>
            Reconciles bank accounts and supplier ledgers via balanced double-entry accounting.
          </p>
        </div>
      </section>
      <AuditFooter />
    </div>
  );
}

function AuditFooter() {
  return (
    <aside className="audit-note">
      <ShieldCheck size={18} />
      <div>
        <strong>Procurement Governance & Tenant Isolation Active</strong>
        <p>
          Supplier contracts and purchase orders are strictly segregated by company ID. All approval
          decisions and goods receipts are audited.
        </p>
      </div>
    </aside>
  );
}
