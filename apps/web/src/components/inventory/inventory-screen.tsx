import {
  Archive,
  ArrowRight,
  Barcode,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  Layers3,
  PackagePlus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { SensitiveActionButton } from "./sensitive-action-button";

type Row = readonly string[];
type Screen = {
  title: string;
  description: string;
  eyebrow: string;
  action?: { label: string; href: string };
  columns?: readonly string[];
  rows?: readonly Row[];
  form?: readonly { label: string; placeholder: string; type?: string }[];
  effect?: string;
};

const navigation = [
  ["Overview", "/inventory"],
  ["Products", "/inventory/products"],
  ["Packaging", "/inventory/products/sample/packaging"],
  ["Warehouses", "/inventory/warehouses"],
  ["Opening stock", "/inventory/opening-stock"],
  ["Adjustments", "/inventory/adjustments"],
  ["Transfers", "/inventory/transfers"],
  ["Counts", "/inventory/counts"],
  ["Ledger", "/inventory/ledger"],
  ["Availability", "/inventory/availability"],
] as const;

const screens: Record<string, Screen> = {
  products: {
    eyebrow: "Product master",
    title: "Products",
    description: "Commercial product families and their separately tracked variants.",
    action: { label: "Create product", href: "/inventory/products/new" },
    columns: ["Product", "Code", "Category", "Variants", "Status"],
    rows: [
      ["Mineral Water", "WATER", "Beverages", "2 variants", "Active"],
      ["Safety Glove", "GLOVE", "PPE", "4 variants", "Active"],
      ["Packing Tape", "TAPE", "Consumables", "1 variant", "Draft"],
    ],
  },
  "products/new": {
    eyebrow: "Product master",
    title: "Create product",
    description: "Create the commercial family first; physical sizes and colours become variants.",
    form: [
      { label: "Product name", placeholder: "e.g. Mineral Water" },
      { label: "Product code", placeholder: "WATER" },
      { label: "Category", placeholder: "Select category" },
      { label: "Brand", placeholder: "Select brand" },
      { label: "Description", placeholder: "Shared product description" },
    ],
    effect: "This creates master data only. It does not create stock or a ledger entry.",
  },
  "products/sample": {
    eyebrow: "Product detail",
    title: "Mineral Water",
    description: "Shared product identity with two separately stocked bottle-size variants.",
    action: { label: "Manage variants", href: "/inventory/products/sample/variants" },
    columns: ["Variant", "SKU", "Base unit", "Tracking", "Availability"],
    rows: [
      ["500 ml Bottle", "WATER-500", "Bottle", "Batch + expiry", "12,840"],
      ["1 Litre Bottle", "WATER-1000", "Bottle", "Batch + expiry", "8,420"],
    ],
  },
  "products/sample/variants": {
    eyebrow: "Stock identities",
    title: "Product variants",
    description: "Different physical sizes remain distinct SKUs, never packaging conversions.",
    form: [
      { label: "Variant name", placeholder: "1 Litre Bottle" },
      { label: "SKU", placeholder: "WATER-1000" },
      { label: "Base stock unit", placeholder: "Bottle" },
      { label: "Tracking mode", placeholder: "Batch" },
      { label: "Expiry tracking", placeholder: "Enabled" },
    ],
    effect: "The base stock unit becomes immutable after the first movement.",
  },
  "products/sample/packaging": {
    eyebrow: "Conversion hierarchy",
    title: "Packaging & conversions",
    description: "Every level stores a direct, exact equivalent to the variant base unit.",
    action: { label: "Add packaging level", href: "/inventory/products/sample/packaging#new" },
    columns: ["Level", "Parent", "Conversion", "Base equivalent", "Barcode"],
    rows: [
      ["Bottle", "—", "1 bottle", "1", "890100000001"],
      ["Pack", "Bottle", "6 bottles", "6", "890100000006"],
      ["Box", "Pack", "4 packs", "24", "890100000024"],
      ["Carton", "Box", "10 boxes", "240", "890100000240"],
      ["Pallet", "Carton", "20 cartons", "4,800", "890100004800"],
    ],
  },
  units: {
    eyebrow: "Reference data",
    title: "Units of measurement",
    description: "Dimension-safe units with controlled decimal precision.",
    action: { label: "Create unit", href: "/inventory/units#new" },
    columns: ["Unit", "Symbol", "Dimension", "Precision", "Usage"],
    rows: [
      ["Piece", "pc", "Count", "0", "38 variants"],
      ["Kilogram", "kg", "Mass", "3", "12 variants"],
      ["Litre", "L", "Volume", "3", "8 variants"],
      ["Metre", "m", "Length", "2", "4 variants"],
    ],
  },
  categories: {
    eyebrow: "Product master",
    title: "Product categories",
    description: "Hierarchical categories for permissions, filtering, and reporting.",
    action: { label: "Create category", href: "/inventory/categories#new" },
    columns: ["Category", "Parent", "Code", "Products", "Status"],
    rows: [
      ["Beverages", "—", "BEV", "18", "Active"],
      ["Water", "Beverages", "WATER", "6", "Active"],
      ["PPE", "—", "PPE", "12", "Active"],
    ],
  },
  brands: {
    eyebrow: "Product master",
    title: "Brands",
    description: "Company-controlled brand reference data.",
    action: { label: "Create brand", href: "/inventory/brands#new" },
    columns: ["Brand", "Code", "Products", "Last updated", "Status"],
    rows: [
      ["Northstar", "NORTH", "14", "Today", "Active"],
      ["BluePeak", "BLUE", "8", "Yesterday", "Active"],
    ],
  },
  warehouses: {
    eyebrow: "Storage network",
    title: "Warehouses",
    description: "Physical and logical facilities within the active company.",
    action: { label: "Create warehouse", href: "/inventory/warehouses#new" },
    columns: ["Warehouse", "Code", "Location tracking", "On-hand units", "Status"],
    rows: [
      ["Central Distribution", "WH-CENTRAL", "Required", "48,230", "Active"],
      ["North Branch", "WH-NORTH", "Optional", "12,480", "Active"],
      ["In Transit", "WH-TRANSIT", "System", "240", "Active"],
    ],
  },
  locations: {
    eyebrow: "Warehouse setup",
    title: "Warehouse locations",
    description: "Zones, racks, shelves, and bins under one warehouse.",
    action: { label: "Create location", href: "/inventory/locations#new" },
    columns: ["Location", "Code", "Type", "Parent", "Stock lines"],
    rows: [
      ["Receiving", "REC", "Receiving", "—", "4"],
      ["Rack A", "RACK-A", "Rack", "Bulk zone", "42"],
      ["Shelf A-01", "A-01", "Shelf", "Rack A", "18"],
      ["Quarantine", "QA", "Quarantine", "—", "3"],
    ],
  },
  "opening-stock": {
    eyebrow: "Controlled posting",
    title: "Opening stock",
    description: "Normalize approved migration quantities into immutable base-unit movements.",
    form: [
      { label: "Reference number", placeholder: "OPEN-2026-001" },
      { label: "Business date", placeholder: "2026-06-28", type: "date" },
      { label: "Warehouse", placeholder: "Central Distribution" },
      { label: "Variant / SKU", placeholder: "Search by name, SKU, or barcode" },
      { label: "Packaging level", placeholder: "Carton (240 bottles)" },
      { label: "Package quantity", placeholder: "3" },
      { label: "Batch and expiry", placeholder: "Required when tracking is enabled" },
      { label: "Posting notes", placeholder: "Approved opening balance source" },
    ],
    effect:
      "Posting appends immutable opening-stock ledger entries and updates the rebuildable projection.",
  },
  adjustments: {
    eyebrow: "Controlled posting",
    title: "Stock adjustment",
    description: "Reasoned increases or decreases with approval-ready audit context.",
    form: [
      { label: "Document number", placeholder: "ADJ-2026-001" },
      { label: "Direction", placeholder: "Decrease" },
      { label: "Reason code", placeholder: "Damage" },
      { label: "Warehouse / location", placeholder: "Central / Quarantine" },
      { label: "Variant and package", placeholder: "WATER-1000 / Box" },
      { label: "Package quantity", placeholder: "1" },
      { label: "Required notes", placeholder: "Describe the physical cause" },
    ],
    effect:
      "A decrease is rejected if eligible stock would become negative. Approval and posting are audited.",
  },
  transfers: {
    eyebrow: "Warehouse movement",
    title: "Stock transfer",
    description: "Linked transfer-out and transfer-in movements preserve every tracking dimension.",
    form: [
      { label: "Transfer number", placeholder: "TRF-2026-001" },
      { label: "Source warehouse", placeholder: "Central Distribution" },
      { label: "Destination warehouse", placeholder: "North Branch" },
      { label: "Variant and package", placeholder: "WATER-1000 / Carton" },
      { label: "Package quantity", placeholder: "1" },
      { label: "Batch / serial allocation", placeholder: "Preserved from source" },
      { label: "Transfer notes", placeholder: "Replenishment" },
    ],
    effect:
      "Posting creates equal linked transfer-out and transfer-in records; total company stock does not change.",
  },
  counts: {
    eyebrow: "Physical verification",
    title: "Stock count",
    description:
      "Compare counted packages to the immutable ledger snapshot and post only approved variance.",
    form: [
      { label: "Count number", placeholder: "COUNT-2026-001" },
      { label: "Warehouse", placeholder: "Central Distribution" },
      { label: "Location scope", placeholder: "Rack A" },
      { label: "Variant", placeholder: "Search by SKU or barcode" },
      { label: "Counted package", placeholder: "Box" },
      { label: "Counted quantity", placeholder: "42" },
      { label: "Variance reason", placeholder: "Required when different" },
    ],
    effect:
      "Approval preserves the original count and appends only the exact positive or negative reconciliation movement.",
  },
  ledger: {
    eyebrow: "Source of truth",
    title: "Inventory ledger",
    description: "Immutable, cursor-paginated movement history in base stock units.",
    columns: ["Posted", "Type", "Reference", "Variant", "Warehouse", "Base quantity"],
    rows: [
      ["28 Jun, 09:42", "Transfer in", "TRF-2026-018", "WATER-1000", "North Branch", "+240"],
      ["28 Jun, 09:42", "Transfer out", "TRF-2026-018", "WATER-1000", "Central", "−240"],
      ["27 Jun, 16:10", "Adjustment decrease", "ADJ-2026-031", "GLOVE-BLU-M", "Central", "−12"],
      ["26 Jun, 10:00", "Opening stock", "OPEN-2026-001", "WATER-1000", "Central", "+8,400"],
    ],
  },
  availability: {
    eyebrow: "Rebuildable projection",
    title: "Stock availability",
    description: "Current base quantity with a selected display packaging conversion.",
    columns: ["Variant", "Warehouse", "Location", "On hand", "Display", "Available"],
    rows: [
      ["WATER-1000", "Central", "Rack A", "8,160 bottles", "34 cartons", "8,160"],
      ["WATER-1000", "North Branch", "Shelf 01", "240 bottles", "1 carton", "240"],
      ["GLOVE-BLU-M", "Central", "Pick face", "1,248 pieces", "156 packs", "1,248"],
    ],
  },
  batches: {
    eyebrow: "Traceability",
    title: "Batch & expiry",
    description: "Eligible, quarantined, expired, and recalled lot status by location.",
    columns: ["Batch", "Variant", "Expiry", "Status", "Warehouse", "Quantity"],
    rows: [
      ["MW-260601", "WATER-1000", "01 Jun 2027", "Available", "Central", "4,800"],
      ["MW-260615", "WATER-1000", "15 Jun 2027", "Available", "Central", "3,360"],
      ["MED-250101", "MED-10MG", "01 Jul 2026", "Near expiry", "North", "240"],
    ],
  },
  serials: {
    eyebrow: "Unit identity",
    title: "Serial numbers",
    description: "One serial per base unit with an immutable movement trail.",
    columns: ["Serial", "Variant", "Status", "Warehouse", "Location", "Last movement"],
    rows: [
      ["SN-LAP-10482", "LAPTOP-14", "Available", "Central", "Secure-01", "Opening stock"],
      ["SN-LAP-10483", "LAPTOP-14", "In transit", "In Transit", "—", "Transfer out"],
      ["SN-SCAN-2201", "SCANNER-HH", "Issued", "—", "—", "Sales dispatch"],
    ],
  },
};

const entryKeys = new Set([
  "products/new",
  "products/sample/variants",
  "opening-stock",
  "adjustments",
  "transfers",
  "counts",
]);

export function InventoryScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <InventoryOverview />;
  const screen = screens[screenKey] ?? screens.products;
  if (!screen) return null;
  return (
    <div className="inventory-page">
      <nav className="inventory-subnav" aria-label="Inventory sections">
        {navigation.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={screenKey && href.endsWith(screenKey) ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
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
      {screen.form ? (
        <InventoryForm
          fields={screen.form}
          effect={screen.effect ?? "Review the inventory effect before posting."}
        />
      ) : (
        <InventoryTable screen={screen} />
      )}
      <aside className="audit-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Tenant and audit controls active</strong>
          <p>
            All data is resolved through the verified company context. Stock changes append ledger
            entries; balances are never edited directly.
          </p>
        </div>
      </aside>
    </div>
  );
}

function InventoryOverview() {
  const metrics = [
    ["Active variants", "63", Boxes],
    ["Warehouses", "3", Warehouse],
    ["Tracked batches", "28", Layers3],
    ["Count tasks", "2", ClipboardCheck],
  ] as const;
  return (
    <div className="inventory-page">
      <nav className="inventory-subnav" aria-label="Inventory sections">
        {navigation.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Inventory control centre</p>
          <h1>Inventory overview</h1>
          <p>Exact quantities, traceable packages, and immutable stock movement.</p>
        </div>
        <Link href="/inventory/opening-stock" className="button button-primary">
          <PackagePlus size={18} />
          Enter opening stock
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
              <p className="eyebrow">Setup progress</p>
              <h2>Inventory foundation</h2>
            </div>
            <span className="status-chip status-chip-live">4 of 5 ready</span>
          </div>
          {[
            ["Units and dimensions", "Complete"],
            ["Warehouses and locations", "Complete"],
            ["Products and variants", "In progress"],
            ["Packaging conversions", "Complete"],
            ["Opening stock", "Ready to post"],
          ].map(([label, status]) => (
            <div className="setup-row" key={label}>
              <CheckCircle2 size={18} />
              <span>{label}</span>
              <small>{status}</small>
            </div>
          ))}
        </section>
        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Inventory signals</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot warning" />
            <div>
              <strong>3 batches near expiry</strong>
              <p>Review within the next 30 days.</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot" />
            <div>
              <strong>2 stock counts awaiting review</strong>
              <p>Central Distribution · Rack A</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Projection reconciled</strong>
              <p>Ledger and availability match.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InventoryTable({ screen }: { screen: Screen }) {
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
              {screen.columns?.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join(":")}>
                {row.map((cell, index) => (
                  <td key={`${cell}-${index.toString()}`}>
                    {index === row.length - 1 &&
                    [
                      "Active",
                      "Available",
                      "Draft",
                      "In transit",
                      "Issued",
                      "Near expiry",
                    ].includes(cell) ? (
                      <span className="status-chip">{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="compact-empty">
          <Archive size={24} />
          <strong>No records yet</strong>
          <p>Create the first record in this company scope.</p>
        </div>
      ) : (
        <div className="pagination">
          <span>Showing {rows.length} records</span>
          <div>
            <button type="button" disabled>
              Previous
            </button>
            <button type="button">Next</button>
          </div>
        </div>
      )}
    </section>
  );
}

function InventoryForm({
  fields,
  effect,
}: {
  fields: NonNullable<Screen["form"]>;
  effect: string;
}) {
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
        {fields.map((field, index) => (
          <label
            className={index === fields.length - 1 ? "field field-wide" : "field"}
            key={field.label}
          >
            <span className="field-label">{field.label}</span>
            <input
              className="input"
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              aria-label={field.label}
            />
          </label>
        ))}
      </form>
      <div className="posting-preview">
        <Barcode size={20} />
        <div>
          <strong>Base-unit posting preview</strong>
          <p>
            Selected packaging quantities will be normalized server-side using the active
            snapshotted conversion.
          </p>
        </div>
      </div>
      <div className="form-actions">
        <button className="button button-secondary" type="button">
          Save draft
        </button>
        <SensitiveActionButton
          label={entryKeys.has("") ? "Review" : "Review and post"}
          effect={effect}
        />
      </div>
    </section>
  );
}
