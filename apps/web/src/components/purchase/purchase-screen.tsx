import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  WalletCards,
} from "lucide-react";
import { PurchaseActionButton } from "./purchase-action-button";
type Screen = {
  eyebrow: string;
  title: string;
  description: string;
  columns?: string[];
  rows?: string[][];
  form?: string[];
  action?: { label: string; href: string };
  effect?: string;
};
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
  ["Outstanding", "/purchases/outstanding"],
] as const;
const screens: Record<string, Screen> = {
  suppliers: {
    eyebrow: "Supplier master",
    title: "Suppliers",
    description: "Company-specific vendors, terms, tax identity, and purchasing status.",
    columns: ["Code", "Supplier", "Terms", "Credit limit", "Currency", "Status"],
    rows: [
      ["SUP-001", "Apex Distribution", "30 days", "₹500,000", "INR", "Active"],
      ["SUP-002", "Northstar Packaging", "15 days", "₹150,000", "INR", "Active"],
    ],
    action: { label: "New supplier", href: "/purchases/suppliers/new" },
  },
  "suppliers/new": {
    eyebrow: "Supplier setup",
    title: "Create supplier",
    description: "Create the legal and commercial supplier record.",
    form: [
      "Supplier code",
      "Legal business name",
      "Display name",
      "GSTIN / tax registration",
      "PAN / tax identity",
      "Payment terms (days)",
      "Credit limit",
      "Default currency",
      "Contact person",
      "Mobile number",
      "Email address",
      "Notes",
    ],
    effect:
      "This creates a supplier only in the active company. Activate it after reviewing tax and payment details.",
  },
  "suppliers/sample": {
    eyebrow: "Supplier profile",
    title: "Apex Distribution",
    description: "Purchasing relationship, terms, controls, and recent history.",
    columns: ["Metric", "Current value", "Status"],
    rows: [
      ["Open purchase orders", "4", "₹286,400"],
      ["Outstanding invoices", "3", "₹148,250"],
      ["Last receipt", "GRN-260618", "Posted"],
      ["Payment terms", "30 days", "Active"],
    ],
    action: { label: "Contacts & addresses", href: "/purchases/suppliers/sample/contacts" },
  },
  "suppliers/sample/contacts": {
    eyebrow: "Supplier relationships",
    title: "Contacts and addresses",
    description: "Billing, pickup, and operational contacts.",
    form: [
      "Contact name",
      "Role",
      "Phone",
      "Email",
      "Address type",
      "Address line 1",
      "Address line 2",
      "City",
      "State / region",
      "Postal code",
      "Country",
    ],
    effect: "This updates supplier contact data within the active company.",
  },
  requisitions: {
    eyebrow: "Internal demand",
    title: "Purchase requisitions",
    description: "Requirements awaiting review or conversion to purchase orders.",
    columns: ["Requisition", "Required", "Warehouse", "Items", "Requester", "Status"],
    rows: [
      ["PR-260041", "02 Jul 2026", "Central", "5", "R. Sharma", "Submitted"],
      ["PR-260040", "30 Jun 2026", "North", "2", "A. Sen", "Approved"],
    ],
    action: { label: "New requisition", href: "/purchases/requisitions/new" },
  },
  "requisitions/new": {
    eyebrow: "Internal demand",
    title: "Create purchase requisition",
    description: "Request stock without changing physical inventory.",
    form: [
      "Reference number",
      "Required date",
      "Warehouse",
      "Product variant",
      "Packaging level",
      "Package quantity",
      "Reason / remarks",
    ],
    effect: "Submitting routes this requisition for approval. It has no stock effect.",
  },
  orders: {
    eyebrow: "Procurement commitments",
    title: "Purchase orders",
    description: "Ordered, received, returned, invoiced, and pending quantities.",
    columns: [
      "Purchase order",
      "Supplier",
      "Order date",
      "Expected",
      "Total",
      "Receipt status",
      "Approval",
    ],
    rows: [
      [
        "PO-260129",
        "Apex Distribution",
        "20 Jun 2026",
        "30 Jun 2026",
        "₹286,400",
        "Part received",
        "Approved",
      ],
      [
        "PO-260130",
        "Northstar Packaging",
        "25 Jun 2026",
        "04 Jul 2026",
        "₹92,000",
        "Pending",
        "Submitted",
      ],
    ],
    action: { label: "New purchase order", href: "/purchases/orders/new" },
  },
  "orders/new": {
    eyebrow: "Procurement commitment",
    title: "Create purchase order",
    description: "Snapshot packaging conversion and negotiated price without adding stock.",
    form: [
      "Supplier",
      "Reference number",
      "Order date",
      "Expected delivery",
      "Currency",
      "Product variant",
      "Packaging level",
      "Package quantity",
      "Package unit price",
      "Discount",
      "Tax",
      "Receiving warehouse",
    ],
    effect: "This saves a purchase order. Physical stock remains unchanged.",
  },
  "orders/sample": {
    eyebrow: "Purchase order",
    title: "PO-260129",
    description: "Approval trail and line-level procurement progress.",
    columns: [
      "Variant",
      "Package",
      "Ordered",
      "Received",
      "Returned",
      "Invoiced",
      "Pending",
      "Price",
    ],
    rows: [
      ["WATER-1000", "Carton × 120", "10", "5", "0", "5", "5", "₹1,950"],
      ["CAP-RED", "Box × 24", "20", "20", "2", "18", "0", "₹210"],
    ],
    effect: "Approval authorizes procurement only. It does not add physical stock.",
  },
  receipts: {
    eyebrow: "Physical receiving",
    title: "Goods receipts",
    description: "Posted and pending receipts linked to approved purchase orders.",
    columns: ["GRN", "Purchase order", "Supplier", "Warehouse", "Received", "Status"],
    rows: [
      ["GRN-260618", "PO-260129", "Apex Distribution", "Central", "28 Jun 2026", "Posted"],
      ["GRN-260617", "PO-260124", "Northstar Packaging", "North", "27 Jun 2026", "Posted"],
    ],
    action: { label: "Receive goods", href: "/purchases/receipts/new" },
  },
  "receipts/new": {
    eyebrow: "Physical receiving",
    title: "Enter goods receipt",
    description: "Receive partial or full quantities with tracking details.",
    form: [
      "Approved purchase order",
      "GRN reference",
      "Receipt date",
      "Warehouse",
      "Location",
      "Product line",
      "Packaging level",
      "Accepted package quantity",
      "Rejected package quantity",
      "Batch number",
      "Expiry date",
      "Serial numbers",
    ],
    effect: "Posting creates an immutable PURCHASE_RECEIPT inventory transaction in base units.",
  },
  "receipts/sample": {
    eyebrow: "Posted goods receipt",
    title: "GRN-260618",
    description: "Receipt traceability from supplier to immutable stock movement.",
    columns: [
      "Variant",
      "Package received",
      "Base quantity",
      "Batch / serial",
      "Location",
      "Ledger reference",
    ],
    rows: [
      ["WATER-1000", "3 cartons", "360 pieces", "MW-260628", "Rack A-04", "PURCHASE_RECEIPT"],
      ["CAP-RED", "5 boxes", "120 pieces", "—", "Rack B-02", "PURCHASE_RECEIPT"],
    ],
  },
  invoices: {
    eyebrow: "Supplier billing",
    title: "Purchase invoices",
    description: "Three-way order, receipt, and invoice matching.",
    columns: ["Invoice", "Supplier", "PO", "Invoice date", "Total", "Outstanding", "Match"],
    rows: [
      [
        "APX-8841",
        "Apex Distribution",
        "PO-260129",
        "28 Jun 2026",
        "₹148,250",
        "₹148,250",
        "Matched",
      ],
      [
        "NS-2209",
        "Northstar Packaging",
        "PO-260124",
        "27 Jun 2026",
        "₹74,500",
        "₹20,000",
        "Mismatch",
      ],
    ],
    action: { label: "Create and match", href: "/purchases/invoices/new" },
  },
  "invoices/new": {
    eyebrow: "Three-way matching",
    title: "Create supplier invoice",
    description: "Compare ordered, received, and invoiced quantity and price.",
    form: [
      "Supplier",
      "Supplier invoice number",
      "Invoice date",
      "Purchase order",
      "Goods receipt",
      "Variant",
      "Invoiced base quantity",
      "Package unit price",
      "Tax",
      "Attachment reference",
    ],
    effect: "Mismatches remain disputed until an authorized exception is approved.",
  },
  returns: {
    eyebrow: "Supplier returns",
    title: "Purchase returns",
    description: "Posted stock decreases linked to original receipts.",
    columns: ["Return", "Supplier", "Original GRN", "Reason", "Quantity", "Credit note", "Status"],
    rows: [
      [
        "PRT-260019",
        "Apex Distribution",
        "GRN-260618",
        "Quality failure",
        "24 pieces",
        "CN-882",
        "Posted",
      ],
    ],
    action: { label: "Create return", href: "/purchases/returns/new" },
  },
  "returns/new": {
    eyebrow: "Stock-impacting return",
    title: "Create purchase return",
    description: "Preserve warehouse, location, batch, expiry, and serial traceability.",
    form: [
      "Supplier",
      "Original goods receipt",
      "Return reference",
      "Return date",
      "Reason",
      "Receipt line",
      "Package quantity",
      "Warehouse",
      "Location",
      "Batch number",
      "Serial numbers",
      "Supplier credit note",
    ],
    effect:
      "Posting creates an immutable PURCHASE_RETURN inventory transaction and cannot drive stock negative.",
  },
  "landed-costs": {
    eyebrow: "Procurement cost",
    title: "Landed-cost allocation",
    description: "Preserve freight and related costs for future valuation and accounting.",
    form: [
      "Goods receipt",
      "Reference number",
      "Allocation method",
      "Cost type",
      "Description",
      "Amount",
      "Currency",
    ],
    effect: "This records allocations only; it does not post a general-ledger journal in Phase 4.",
  },
  payments: {
    eyebrow: "Payable foundation",
    title: "Record supplier payment",
    description: "Allocate a payment without implementing bank reconciliation.",
    form: [
      "Supplier",
      "Payment date",
      "Method",
      "Payment reference",
      "Amount",
      "Currency",
      "Invoice",
      "Allocation amount",
    ],
    effect: "Allocation cannot exceed either the payment amount or invoice outstanding balance.",
  },
  outstanding: {
    eyebrow: "Supplier exposure",
    title: "Supplier outstanding summary",
    description: "Invoice balances and due-date foundation by supplier.",
    columns: ["Supplier", "Current", "1–30 days", "31–60 days", "61+ days", "Total"],
    rows: [
      ["Apex Distribution", "₹98,250", "₹50,000", "₹0", "₹0", "₹148,250"],
      ["Northstar Packaging", "₹20,000", "₹0", "₹0", "₹0", "₹20,000"],
    ],
  },
};
export function PurchaseScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <Overview />;
  const screen = screens[screenKey] ?? screens.orders;
  if (!screen) return null;
  return (
    <div className="inventory-page">
      <Subnav active={screenKey} />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1>{screen.title}</h1>
          <p>{screen.description}</p>
        </div>
        {screen.action ? (
          <Link className="button button-primary" href={screen.action.href}>
            {screen.action.label}
            <ArrowRight size={17} />
          </Link>
        ) : null}
      </div>
      {screen.form ? <Form screen={screen} /> : <Table screen={screen} />}
      <aside className="audit-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Tenant, permission, and audit controls active</strong>
          <p>
            Resources resolve through the verified company context. Posted receipt and return
            history is append-only.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Subnav({ active }: { active?: string }) {
  return (
    <nav className="inventory-subnav" aria-label="Purchase sections">
      {nav.map(([label, href]) => (
        <Link key={href} href={href} className={active && href.endsWith(active) ? "active" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
function Overview() {
  const metrics = [
    ["Open orders", "12", ClipboardCheck],
    ["Pending receipts", "7", Truck],
    ["Invoice mismatches", "2", ReceiptText],
    ["Outstanding", "₹168,250", WalletCards],
  ] as const;
  return (
    <div className="inventory-page">
      <Subnav />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Purchase control centre</p>
          <h1>Purchase dashboard</h1>
          <p>From supplier setup to receipt, matching, return, and payment allocation.</p>
        </div>
        <Link href="/purchases/orders/new" className="button button-primary">
          Create purchase order
          <ArrowRight size={17} />
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
              <p className="eyebrow">Purchase flow</p>
              <h2>Today’s workload</h2>
            </div>
            <PackageCheck size={20} />
          </div>
          {[
            ["Requisitions awaiting approval", "3"],
            ["Orders due this week", "6"],
            ["Receipts awaiting invoice", "4"],
            ["Mismatches requiring review", "2"],
          ].map(([l, v]) => (
            <div className="setup-row" key={l}>
              <CheckCircle2 size={18} />
              <span>{l}</span>
              <small>{v}</small>
            </div>
          ))}
        </section>
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Integrity</p>
              <h2>Posting boundaries</h2>
            </div>
            <Building2 size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Orders have no stock effect</strong>
              <p>Only posted goods receipts add stock.</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot" />
            <div>
              <strong>Returns use the stock ledger</strong>
              <p>Negative stock remains blocked.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
function Table({ screen }: { screen: Screen }) {
  const rows = screen.rows ?? [];
  return (
    <section className="inventory-panel table-panel">
      <div className="list-toolbar">
        <label className="search-control">
          <Search size={17} />
          <span className="sr-only">Search</span>
          <input placeholder={`Search ${screen.title.toLowerCase()}`} />
        </label>
        <button className="button button-secondary" type="button">
          <Filter size={16} />
          Filters
        </button>
        <button className="icon-button" type="button" aria-label="Choose columns">
          <SlidersHorizontal size={17} />
        </button>
      </div>
      <div className="table-scroll">
        <table className="inventory-table">
          <thead>
            <tr>
              {screen.columns?.map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.join(":")}>
                {r.map((c, i) => (
                  <td key={`${c}-${i.toString()}`}>
                    {i === r.length - 1 ? <span className="status-chip">{c}</span> : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length ? (
        <div className="pagination">
          <span>Showing {rows.length} records</span>
          <div>
            <button type="button" disabled>
              Previous
            </button>
            <button type="button">Next</button>
          </div>
        </div>
      ) : (
        <div className="compact-empty">
          <Archive size={24} />
          <strong>No records yet</strong>
          <p>Create the first record in this company scope.</p>
        </div>
      )}
    </section>
  );
}
function Form({ screen }: { screen: Screen }) {
  const fields = screen.form ?? [];
  return (
    <section className="inventory-panel entry-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Required information</p>
          <h2>Entry details</h2>
        </div>
        <span className="status-chip">Draft</span>
      </div>
      <form className="inventory-form">
        {fields.map((f, i) => (
          <label className={i === fields.length - 1 ? "field field-wide" : "field"} key={f}>
            <span className="field-label">{f}</span>
            <input className="input" aria-label={f} placeholder={f} />
          </label>
        ))}
      </form>
      <div className="posting-preview">
        <Boxes size={20} />
        <div>
          <strong>Purchase control preview</strong>
          <p>
            Packaging conversion, price, quantity, tax, and references are validated server-side.
          </p>
        </div>
      </div>
      <div className="form-actions">
        <button className="button button-secondary" type="button">
          Save draft
        </button>
        <PurchaseActionButton
          label="Review and continue"
          effect={screen.effect ?? "This action follows the configured approval workflow."}
        />
      </div>
    </section>
  );
}
