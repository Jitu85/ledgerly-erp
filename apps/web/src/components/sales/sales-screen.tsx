import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  PackageCheck,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  UsersRound,
} from "lucide-react";
import { SalesActionButton } from "./sales-action-button";
type Screen = {
  title: string;
  description: string;
  columns?: string[];
  rows?: string[][];
  form?: string[];
  action?: { label: string; href: string };
  effect?: string;
};
const nav = [
  ["Dashboard", "/sales"],
  ["Customers", "/sales/customers"],
  ["Price lists", "/sales/price-lists"],
  ["Quotations", "/sales/quotations"],
  ["Orders", "/sales/orders"],
  ["Reservations", "/sales/reservations"],
  ["Deliveries", "/sales/deliveries"],
  ["Invoices", "/sales/invoices"],
  ["Returns", "/sales/returns"],
  ["Credit notes", "/sales/credit-notes"],
  ["Payments", "/sales/payments"],
  ["Outstanding", "/sales/outstanding"],
] as const;
const forms = {
  customer: [
    "Customer code",
    "Legal business name",
    "Display name",
    "Contact person",
    "Mobile number",
    "Email address",
    "GSTIN / tax registration",
    "PAN / tax identity",
    "Customer category",
    "Payment terms (days)",
    "Credit limit",
    "Default price list",
    "Default currency",
    "Salesperson",
    "Notes",
  ],
  contact: [
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
  price: [
    "Price list code",
    "Name",
    "Currency",
    "Effective from",
    "Effective to",
    "Product variant",
    "Packaging level",
    "Selling price",
    "Minimum selling price",
    "Tax inclusive",
  ],
  quote: [
    "Customer",
    "Quotation number",
    "Quotation date",
    "Valid until",
    "Currency",
    "Product variant",
    "Packaging level",
    "Package quantity",
    "Package price",
    "Discount",
    "Tax",
    "Warehouse",
  ],
  order: [
    "Customer / accepted quotation",
    "Sales order number",
    "Order date",
    "Expected delivery",
    "Currency",
    "Product variant",
    "Packaging level",
    "Package quantity",
    "Package price",
    "Discount",
    "Tax",
    "Warehouse",
    "Reserve stock",
  ],
  delivery: [
    "Approved sales order",
    "Delivery challan number",
    "Dispatch date",
    "Order line",
    "Package quantity",
    "Source warehouse",
    "Location",
    "Batch number",
    "Expiry date",
    "Serial numbers",
  ],
  invoice: [
    "Customer",
    "Invoice number",
    "Invoice date",
    "Sales order",
    "Delivery challan",
    "Currency",
    "Delivered line",
    "Package quantity",
    "Selling price",
    "Discount",
    "Tax",
    "Immediate delivery",
  ],
  return: [
    "Customer",
    "Original invoice",
    "Original delivery",
    "Return number",
    "Return date",
    "Return reason",
    "Condition",
    "Delivery line",
    "Package quantity",
    "Warehouse",
    "Location",
    "Batch / serial",
  ],
  credit: [
    "Customer",
    "Original invoice",
    "Sales return",
    "Credit note number",
    "Credit date",
    "Currency",
    "Reason",
    "Amount",
  ],
  payment: [
    "Customer",
    "Payment date",
    "Payment method",
    "Payment reference",
    "Currency",
    "Amount",
    "Sales invoice",
    "Allocation amount",
  ],
} as const;
const screens: Record<string, Screen> = {
  customers: {
    title: "Customers",
    description: "Company-specific customer, credit, pricing, tax and payment settings.",
    columns: ["Code", "Customer", "Category", "Terms", "Credit limit", "Salesperson", "Status"],
    rows: [
      ["CUS-001", "Sharma Traders", "Wholesale", "30 days", "₹500,000", "Amit Kumar", "Active"],
      ["CUS-002", "Patel General Stores", "Retail", "15 days", "₹150,000", "Pooja Singh", "Active"],
    ],
    action: { label: "New customer", href: "/sales/customers/new" },
  },
  "customers/new": {
    title: "Create customer",
    description: "Create a customer only in the active company.",
    form: [...forms.customer],
    effect: "The customer remains inactive until commercial and tax details are reviewed.",
  },
  "customers/sample": {
    title: "Sharma Traders",
    description: "Credit exposure, open documents and sales history.",
    columns: ["Metric", "Current value", "Status"],
    rows: [
      ["Open sales orders", "4", "₹286,400"],
      ["Outstanding invoices", "3", "₹148,250"],
      ["Available credit", "₹351,750", "Within limit"],
      ["Last payment", "28 Jun 2026", "Allocated"],
    ],
    action: { label: "Contacts & addresses", href: "/sales/customers/sample/contacts" },
  },
  "customers/sample/edit": {
    title: "Edit customer",
    description: "Update mutable customer settings without rewriting transaction history.",
    form: [...forms.customer],
  },
  "customers/sample/contacts": {
    title: "Customer contacts and addresses",
    description: "Billing, shipping and operational relationships.",
    form: [...forms.contact],
  },
  "customer-categories": {
    title: "Customer categories",
    description: "Group customers for pricing and policy.",
    columns: ["Code", "Category", "Customers", "Price list", "Status"],
    rows: [["WHOLESALE", "Wholesale", "42", "Trade 2026", "Active"]],
  },
  "price-lists": {
    title: "Price lists",
    description: "Effective-dated package and customer pricing.",
    columns: ["Code", "Price list", "Currency", "Effective", "Customers", "Status"],
    rows: [["TRADE-26", "Trade 2026", "INR", "01 Apr 2026", "42", "Active"]],
    action: { label: "New price list", href: "/sales/price-lists/new" },
  },
  "price-lists/new": {
    title: "Create price list",
    description: "Prices are snapshotted onto sales documents.",
    form: [...forms.price],
  },
  quotations: {
    title: "Sales quotations",
    description: "Offers that never affect stock.",
    columns: ["Quotation", "Customer", "Valid until", "Value", "Salesperson", "Status"],
    rows: [["QUO-260456", "Sharma Traders", "05 Jul 2026", "₹245,670", "Amit Kumar", "Sent"]],
    action: { label: "New quotation", href: "/sales/quotations/new" },
  },
  "quotations/new": {
    title: "Create quotation",
    description: "Prepare an offer with package, price, discount and tax snapshots.",
    form: [...forms.quote],
    effect: "Sending or accepting this quotation has no stock effect.",
  },
  orders: {
    title: "Sales orders",
    description: "Ordered, reserved, dispatched, invoiced, returned and pending quantities.",
    columns: ["Order", "Customer", "Order date", "Total", "Reserved", "Dispatch", "Approval"],
    rows: [
      [
        "SO-260129",
        "Sharma Traders",
        "28 Jun 2026",
        "₹286,400",
        "240 pieces",
        "Part dispatched",
        "Approved",
      ],
    ],
    action: { label: "New sales order", href: "/sales/orders/new" },
  },
  "orders/new": {
    title: "Create sales order",
    description: "Check price, availability and customer credit before approval.",
    form: [...forms.order],
    effect: "Approval may reserve stock but never reduces physical stock.",
  },
  "orders/sample": {
    title: "SO-260129",
    description: "Approval, credit signals and line-level fulfilment progress.",
    columns: [
      "Variant",
      "Package",
      "Ordered",
      "Reserved",
      "Dispatched",
      "Invoiced",
      "Returned",
      "Pending",
    ],
    rows: [["WATER-1000", "Carton × 120", "2", "1", "1", "1", "0", "1"]],
    effect: "Dispatch is the only outbound physical stock event.",
  },
  reservations: {
    title: "Stock reservations",
    description: "Reserved stock is separate from physical and available-to-sell stock.",
    columns: [
      "Reservation",
      "Order",
      "Variant",
      "Warehouse",
      "Physical",
      "Reserved",
      "Available",
      "Status",
    ],
    rows: [["RSV-260129", "SO-260129", "WATER-1000", "Central", "500", "120", "380", "Active"]],
  },
  deliveries: {
    title: "Delivery challans",
    description: "Partial dispatches with package, warehouse, batch and serial traceability.",
    columns: ["Challan", "Order", "Customer", "Warehouse", "Dispatch date", "Status"],
    rows: [["DC-260618", "SO-260129", "Sharma Traders", "Central", "29 Jun 2026", "Dispatched"]],
    action: { label: "Create delivery", href: "/sales/deliveries/new" },
  },
  "deliveries/new": {
    title: "Create delivery challan",
    description: "Dispatch approved quantities through the immutable stock ledger.",
    form: [...forms.delivery],
    effect:
      "Posting creates one immutable SALES_DISPATCH transaction and releases related reservations.",
  },
  "deliveries/sample": {
    title: "DC-260618",
    description: "Trace dispatched stock from customer order to ledger.",
    columns: ["Variant", "Package", "Base quantity", "Batch / serial", "Location", "Ledger effect"],
    rows: [
      ["WATER-1000", "1 carton", "120 pieces", "MW-260628", "Rack A-04", "SALES_DISPATCH −120"],
    ],
  },
  invoices: {
    title: "Sales invoices",
    description: "Commercial invoices preserve delivered quantities and historical pricing.",
    columns: [
      "Invoice",
      "Customer",
      "Order / delivery",
      "Invoice date",
      "Total",
      "Outstanding",
      "Status",
    ],
    rows: [
      [
        "INV-260884",
        "Sharma Traders",
        "DC-260618",
        "29 Jun 2026",
        "₹148,250",
        "₹98,250",
        "Partially paid",
      ],
    ],
    action: { label: "Create invoice", href: "/sales/invoices/new" },
  },
  "invoices/new": {
    title: "Create sales invoice",
    description: "Invoice delivered goods or use an authorized immediate-delivery flow.",
    form: [...forms.invoice],
    effect:
      "Immediate delivery creates exactly one linked dispatch; normal invoices do not alter stock.",
  },
  "invoices/sample": {
    title: "INV-260884",
    description: "Price, tax, allocation and delivery trace.",
    columns: ["Line", "Delivered", "Price", "Discount", "Tax", "Total", "Outstanding"],
    rows: [["WATER-1000", "120 pieces", "₹1,950", "₹0", "₹35,100", "₹269,100", "₹98,250"]],
  },
  returns: {
    title: "Sales returns",
    description: "Customer returns restore stock only through immutable ledger entries.",
    columns: ["Return", "Customer", "Invoice", "Reason", "Condition", "Quantity", "Status"],
    rows: [
      [
        "SRT-260019",
        "Sharma Traders",
        "INV-260884",
        "Defective",
        "Quarantine",
        "12 pieces",
        "Posted",
      ],
    ],
    action: { label: "Create return", href: "/sales/returns/new" },
  },
  "returns/new": {
    title: "Create sales return",
    description: "Preserve original delivery and tracking identity.",
    form: [...forms.return],
    effect: "Posting creates SALES_RETURN inventory entries and cannot exceed original dispatch.",
  },
  "credit-notes": {
    title: "Credit notes",
    description: "Approved customer credits linked to invoices or returns.",
    columns: ["Credit note", "Customer", "Invoice", "Reason", "Amount", "Status"],
    rows: [
      ["CN-260082", "Sharma Traders", "INV-260884", "Defective return", "₹23,400", "Approved"],
    ],
    action: { label: "Create credit note", href: "/sales/credit-notes/new" },
  },
  "credit-notes/new": {
    title: "Create credit note",
    description: "Create a controlled commercial credit without duplicating stock effects.",
    form: [...forms.credit],
    effect: "Credit changes customer exposure; stock changes only through a linked sales return.",
  },
  payments: {
    title: "Customer payment",
    description: "Allocate one receipt across eligible customer invoices.",
    form: [...forms.payment],
    effect: "Allocation cannot exceed payment value or invoice outstanding amount.",
  },
  outstanding: {
    title: "Customer outstanding summary",
    description: "Current and aged invoice exposure by customer.",
    columns: [
      "Customer",
      "Current",
      "1–30 days",
      "31–60 days",
      "61+ days",
      "Credit limit",
      "Total",
    ],
    rows: [["Sharma Traders", "₹98,250", "₹50,000", "₹0", "₹0", "₹500,000", "₹148,250"]],
  },
};
export function SalesScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <Overview />;
  const screen = screens[screenKey] ?? screens.orders;
  if (!screen) return null;
  return (
    <div className="inventory-page">
      <Subnav active={screenKey} />
      <div className="page-heading inventory-heading">
        <div>
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
          <strong>Tenant, permission and audit controls active</strong>
          <p>
            Every resource resolves through the verified company context. Dispatch and return
            history is append-only.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Subnav({ active }: { active?: string }) {
  return (
    <nav className="inventory-subnav" aria-label="Sales sections">
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
    ["Open quotations", "28", ClipboardCheck],
    ["Reserved stock", "240 pieces", Boxes],
    ["Pending dispatches", "16", Truck],
    ["Customer outstanding", "₹148,250", BadgeIndianRupee],
  ] as const;
  return (
    <div className="inventory-page">
      <Subnav />
      <div className="page-heading inventory-heading">
        <div>
          <h1>Sales dashboard</h1>
          <p>Customer, quotation, reservation, dispatch, invoice, return and collection control.</p>
        </div>
        <Link href="/sales/orders/new" className="button button-primary">
          Create sales order
          <ArrowRight size={17} />
        </Link>
      </div>
      <div className="metric-grid">
        {metrics.map(([l, v, I]) => (
          <section className="metric-card" key={l}>
            <span>
              <I size={19} />
            </span>
            <p>{l}</p>
            <strong>{v}</strong>
            <small>Active company scope</small>
          </section>
        ))}
      </div>
      <div className="inventory-overview-grid">
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <h2>Sales pipeline / workload</h2>
            </div>
            <PackageCheck size={20} />
          </div>
          {[
            ["Quotations expiring this week", "7"],
            ["Orders awaiting approval", "3"],
            ["Orders ready to dispatch", "6"],
            ["Invoices overdue", "2"],
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
              <h2>Credit exposure</h2>
            </div>
            <UsersRound size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>₹148,250 outstanding</strong>
              <p>56 customers · 2 require review</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot" />
            <div>
              <strong>Physical 500 · Reserved 120</strong>
              <p>Available to sell: 380 pieces</p>
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
          <strong>Sales control preview</strong>
          <p>
            Package conversion, price, credit, availability, tax and references are validated
            server-side.
          </p>
        </div>
      </div>
      <div className="form-actions">
        <button className="button button-secondary" type="button">
          Save draft
        </button>
        <SalesActionButton
          label="Review and continue"
          effect={screen.effect ?? "This action follows the configured approval workflow."}
        />
      </div>
    </section>
  );
}
