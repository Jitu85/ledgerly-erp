"use client";

import {
  Archive,
  Barcode,
  Boxes,
  CheckCircle2,
  Clock3,
  Download,
  Layers3,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SyntheticEvent } from "react";
import { apiUrl, getJson, postApi } from "@/lib/api";
import { SensitiveActionButton } from "./sensitive-action-button";

const navigation = [
  ["Overview", "/inventory"],
  ["Products", "/inventory/products"],
  ["Warehouses", "/inventory/warehouses"],
  ["Units", "/inventory/units"],
  ["Categories", "/inventory/categories"],
  ["Brands", "/inventory/brands"],
  ["Opening stock", "/inventory/opening-stock"],
  ["Adjustments", "/inventory/adjustments"],
  ["Transfers", "/inventory/transfers"],
  ["Counts", "/inventory/counts"],
  ["Ledger", "/inventory/ledger"],
  ["Availability", "/inventory/availability"],
] as const;

type Product = {
  id: string;
  code: string;
  name: string;
  productType: string;
  description?: string;
  createdAt: string;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
  locationTracking: boolean;
};

type LedgerEntry = {
  id: string;
  movementType: string;
  referenceNumber: string;
  businessDate: string;
  variantId: string;
  warehouseId: string;
  baseQuantity: string;
  createdAt: string;
};

type AvailabilityEntry = {
  variantId: string;
  warehouseId: string;
  locationId?: string;
  onHandQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
};

type GenericItem = {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  dimension?: string;
  description?: string;
};

export function InventoryScreen({ screenKey }: { screenKey: string }) {
  if (!screenKey) return <InventoryOverview />;
  if (screenKey === "products") return <ProductsScreen />;
  if (screenKey === "products/new") return <CreateProductScreen />;
  if (screenKey === "warehouses") return <WarehousesScreen />;
  if (screenKey === "units") return <UnitsScreen />;
  if (screenKey === "categories") return <CategoriesScreen />;
  if (screenKey === "brands") return <BrandsScreen />;
  if (screenKey === "opening-stock") return <OpeningStockScreen />;
  if (screenKey === "adjustments") return <StockAdjustmentScreen />;
  if (screenKey === "transfers") return <StockTransferScreen />;
  if (screenKey === "counts") return <StockCountScreen />;
  if (screenKey === "ledger") return <LedgerScreen />;
  if (screenKey === "availability") return <AvailabilityScreen />;

  return <ProductsScreen />;
}

function SubNav({ current }: { current: string }) {
  return (
    <nav className="inventory-subnav" aria-label="Inventory sections">
      {navigation.map(([label, href]) => {
        const active = current === href || (href !== "/inventory" && current.startsWith(href));
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function InventoryOverview() {
  const [counts, setCounts] = useState({
    products: 0,
    warehouses: 0,
    ledger: 0,
    availability: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getJson<Product[]>("/products"),
      getJson<Warehouse[]>("/warehouses"),
      getJson<LedgerEntry[]>("/stock/ledger"),
      getJson<AvailabilityEntry[]>("/stock/availability"),
    ]).then(([p, w, l, a]) => {
      if (!active) return;
      setCounts({
        products: p.status === "fulfilled" && Array.isArray(p.value) ? p.value.length : 0,
        warehouses: w.status === "fulfilled" && Array.isArray(w.value) ? w.value.length : 0,
        ledger: l.status === "fulfilled" && Array.isArray(l.value) ? l.value.length : 0,
        availability: a.status === "fulfilled" && Array.isArray(a.value) ? a.value.length : 0,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    ["Active products", loading ? "..." : counts.products.toString(), Boxes],
    ["Warehouses", loading ? "..." : counts.warehouses.toString(), WarehouseIcon],
    ["Ledger movements", loading ? "..." : counts.ledger.toString(), Layers3],
    ["Stock positions", loading ? "..." : counts.availability.toString(), Barcode],
  ] as const;

  return (
    <div className="inventory-page">
      <SubNav current="/inventory" />
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
            <span className="status-chip status-chip-live">Live Scope</span>
          </div>
          {[
            ["Units and dimensions", counts.products > 0 ? "Configured" : "Ready to add"],
            [
              "Warehouses and locations",
              counts.warehouses > 0 ? `${counts.warehouses.toString()} active` : "Add warehouse",
            ],
            [
              "Products & variants",
              counts.products > 0 ? `${counts.products.toString()} registered` : "Add product",
            ],
            [
              "Opening stock & ledger",
              counts.ledger > 0 ? `${counts.ledger.toString()} movements` : "Ready to post",
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
              <h2>Integrity signals</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Row-Level Security Active</strong>
              <p>All stock queries strictly company-scoped.</p>
            </div>
          </div>
          <div className="signal-row">
            <span className="signal-dot success" />
            <div>
              <strong>Immutable Ledger Enforced</strong>
              <p>Direct stock balance edits are prohibited.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void getJson<Product[]>("/products")
      .then((data) => {
        if (active) {
          setProducts(Array.isArray(data) ? data : []);
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

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/products" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Product master</p>
          <h1>Products</h1>
          <p>Commercial product families and their separately tracked variants.</p>
        </div>
        <Link className="button button-primary" href="/inventory/products/new">
          <Plus size={17} />
          Create product
        </Link>
      </div>

      <section className="inventory-panel table-panel">
        <div className="list-toolbar">
          <label className="search-control">
            <Search size={17} />
            <span className="sr-only">Search</span>
            <input
              placeholder="Search products by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Product Name</th>
                <th scope="col">Code</th>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    Loading products...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No products found in this company.</p>
                    <Link
                      href="/inventory/products/new"
                      className="button button-secondary"
                      style={{ marginTop: "12px", display: "inline-flex" }}
                    >
                      <Plus size={16} /> Create first product
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>
                      <code>{product.code}</code>
                    </td>
                    <td>{product.productType}</td>
                    <td>{product.description ?? "—"}</td>
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

function CreateProductScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<"GOODS" | "SERVICE">("GOODS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!code || !name) {
      setError("Product code and name are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/products", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        productType,
      });
      router.push("/inventory/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/products" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Product master</p>
          <h1>Create product</h1>
          <p>Create the commercial family first; physical sizes and colours become variants.</p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Required information</p>
            <h2>Product Details</h2>
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
            <span className="field-label">Product Name *</span>
            <input
              className="input"
              required
              placeholder="e.g. Mineral Water Bottle"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Product Code *</span>
            <input
              className="input"
              required
              placeholder="e.g. WATER-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Product Type</span>
            <select
              className="input"
              value={productType}
              onChange={(e) => setProductType(e.target.value as "GOODS" | "SERVICE")}
            >
              <option value="GOODS">Physical Goods (Stock Tracked)</option>
              <option value="SERVICE">Service (Non-stock)</option>
            </select>
          </label>

          <label className="field field-wide">
            <span className="field-label">Description</span>
            <input
              className="input"
              placeholder="Optional commercial description or specifications"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="posting-preview">
            <Barcode size={20} />
            <div>
              <strong>Master Data Integrity</strong>
              <p>
                This creates master product data only. It does not alter stock balances or post
                ledger entries.
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => router.push("/inventory/products")}
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Product"}
            </button>
          </div>
        </form>
      </section>

      <AuditFooter />
    </div>
  );
}

function WarehousesScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locationTracking, setLocationTracking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadWarehouses() {
    void getJson<Warehouse[]>("/warehouses")
      .then((data) => {
        setWarehouses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function handleCreateWarehouse(e: SyntheticEvent) {
    e.preventDefault();
    if (!code || !name) return;
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/warehouses", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        locationTracking,
      });
      setCode("");
      setName("");
      setLocationTracking(false);
      setShowForm(false);
      loadWarehouses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create warehouse");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/warehouses" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Storage network</p>
          <h1>Warehouses</h1>
          <p>Physical and logical facilities within the active company.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          {showForm ? "Close Form" : "Create warehouse"}
        </button>
      </div>

      {showForm ? (
        <section className="inventory-panel entry-panel" style={{ marginBottom: "24px" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Facility setup</p>
              <h2>Add New Warehouse</h2>
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
          <form className="inventory-form" onSubmit={handleCreateWarehouse}>
            <label className="field">
              <span className="field-label">Warehouse Name *</span>
              <input
                className="input"
                required
                placeholder="e.g. Central Distribution Center"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Warehouse Code *</span>
              <input
                className="input"
                required
                placeholder="e.g. WH-CENTRAL"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label
              className="field field-wide"
              style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}
            >
              <input
                type="checkbox"
                checked={locationTracking}
                onChange={(e) => setLocationTracking(e.target.checked)}
              />
              <span className="field-label" style={{ margin: 0 }}>
                Enable bin / rack location tracking inside this warehouse
              </span>
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Warehouse"}
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
                <th scope="col">Warehouse</th>
                <th scope="col">Code</th>
                <th scope="col">Location Tracking</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    Loading warehouses...
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No warehouses configured.</p>
                  </td>
                </tr>
              ) : (
                warehouses.map((wh) => (
                  <tr key={wh.id}>
                    <td>
                      <strong>{wh.name}</strong>
                    </td>
                    <td>
                      <code>{wh.code}</code>
                    </td>
                    <td>{wh.locationTracking ? "Enabled (Zones & Racks)" : "Disabled"}</td>
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

function UnitsScreen() {
  const [units, setUnits] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dimension, setDimension] = useState<"COUNT" | "MASS" | "VOLUME" | "LENGTH">("COUNT");
  const [decimalScale, setDecimalScale] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadUnits() {
    void getJson<GenericItem[]>("/units-of-measurement")
      .then((data) => {
        setUnits(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadUnits();
  }, []);

  async function handleCreate(e: SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/units-of-measurement", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        symbol: symbol.trim(),
        dimension,
        decimalScale,
      });
      setCode("");
      setName("");
      setSymbol("");
      setShowForm(false);
      loadUnits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create unit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/units" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1>Units of Measurement</h1>
          <p>Dimension-safe units with controlled decimal precision.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          {showForm ? "Close Form" : "Create unit"}
        </button>
      </div>

      {showForm ? (
        <section className="inventory-panel entry-panel" style={{ marginBottom: "24px" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Unit setup</p>
              <h2>Add Unit of Measurement</h2>
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
          <form className="inventory-form" onSubmit={handleCreate}>
            <label className="field">
              <span className="field-label">Name *</span>
              <input
                className="input"
                required
                placeholder="e.g. Piece, Kilogram, Litre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Code *</span>
              <input
                className="input"
                required
                placeholder="e.g. PC, KG, L"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Symbol *</span>
              <input
                className="input"
                required
                placeholder="e.g. pc, kg"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Dimension</span>
              <select
                className="input"
                value={dimension}
                onChange={(e) =>
                  setDimension(e.target.value as "COUNT" | "MASS" | "VOLUME" | "LENGTH")
                }
              >
                <option value="COUNT">Count (Discrete units)</option>
                <option value="MASS">Mass / Weight</option>
                <option value="VOLUME">Volume / Liquid</option>
                <option value="LENGTH">Length / Linear</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Decimal Precision (0-8)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={8}
                value={decimalScale}
                onChange={(e) => setDecimalScale(Number.parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Unit"}
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
                <th scope="col">Unit Name</th>
                <th scope="col">Code</th>
                <th scope="col">Symbol</th>
                <th scope="col">Dimension</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    Loading units...
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No units of measurement defined yet.</p>
                  </td>
                </tr>
              ) : (
                units.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>
                      <code>{u.code}</code>
                    </td>
                    <td>{u.symbol}</td>
                    <td>{u.dimension}</td>
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

function CategoriesScreen() {
  const [categories, setCategories] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadCategories() {
    void getJson<GenericItem[]>("/categories")
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/categories", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      });
      setCode("");
      setName("");
      setShowForm(false);
      loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/categories" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Product master</p>
          <h1>Product Categories</h1>
          <p>Hierarchical categories for organization, reporting, and classification.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          {showForm ? "Close Form" : "Create category"}
        </button>
      </div>

      {showForm ? (
        <section className="inventory-panel entry-panel" style={{ marginBottom: "24px" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Classification</p>
              <h2>Add Category</h2>
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
          <form className="inventory-form" onSubmit={handleCreate}>
            <label className="field">
              <span className="field-label">Category Name *</span>
              <input
                className="input"
                required
                placeholder="e.g. Beverages, Electronics"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Category Code *</span>
              <input
                className="input"
                required
                placeholder="e.g. BEV, ELEC"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Category"}
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
                <th scope="col">Category</th>
                <th scope="col">Code</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px" }}>
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No categories defined.</p>
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>
                      <code>{c.code}</code>
                    </td>
                    <td>{c.description ?? "—"}</td>
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

function BrandsScreen() {
  const [brands, setBrands] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadBrands() {
    void getJson<GenericItem[]>("/brands")
      .then((data) => {
        setBrands(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadBrands();
  }, []);

  async function handleCreate(e: SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/brands", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      });
      setCode("");
      setName("");
      setShowForm(false);
      loadBrands();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/brands" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Product master</p>
          <h1>Brands</h1>
          <p>Company-controlled brand reference data.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          {showForm ? "Close Form" : "Create brand"}
        </button>
      </div>

      {showForm ? (
        <section className="inventory-panel entry-panel" style={{ marginBottom: "24px" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Brand setup</p>
              <h2>Add Brand</h2>
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
          <form className="inventory-form" onSubmit={handleCreate}>
            <label className="field">
              <span className="field-label">Brand Name *</span>
              <input
                className="input"
                required
                placeholder="e.g. Northstar, Acron"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Brand Code *</span>
              <input
                className="input"
                required
                placeholder="e.g. NORTH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Brand"}
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
                <th scope="col">Brand Name</th>
                <th scope="col">Code</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px" }}>
                    Loading brands...
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No brands defined.</p>
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                    </td>
                    <td>
                      <code>{b.code}</code>
                    </td>
                    <td>{b.description ?? "—"}</td>
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

function OpeningStockScreen() {
  const router = useRouter();
  const [refNo, setRefNo] = useState(`OPEN-${new Date().getFullYear().toString()}-001`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [notes, setNotes] = useState("Approved opening physical stock migration");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getJson<Warehouse[]>("/warehouses").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setWarehouses(data);
        setWarehouseId(data[0].id);
      }
    });
  }, []);

  async function handlePost() {
    if (!refNo || !warehouseId || !variantId || !quantity || !notes) {
      setError("Please complete all required fields including Variant UUID and Warehouse.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/opening-stock/post", {
        referenceNumber: refNo.trim(),
        businessDate: date,
        notes: notes.trim(),
        lines: [
          {
            variantId: variantId.trim(),
            warehouseId,
            packageQuantity: quantity.trim(),
          },
        ],
      });
      router.push("/inventory/ledger");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post opening stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/opening-stock" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Controlled posting</p>
          <h1>Opening stock</h1>
          <p>Normalize approved migration quantities into immutable base-unit movements.</p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Ledger Entry</p>
            <h2>Opening Stock Details</h2>
          </div>
          <span className="status-chip status-chip-warning">Immutable post</span>
        </div>

        {error ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <div>
              <strong>Posting Error</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <div className="inventory-form">
          <label className="field">
            <span className="field-label">Reference number *</span>
            <input className="input" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">Business date *</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Warehouse *</span>
            {warehouses.length > 0 ? (
              <select
                className="input"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="Enter warehouse UUID"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              />
            )}
          </label>

          <label className="field">
            <span className="field-label">Variant UUID *</span>
            <input
              className="input"
              placeholder="Product variant UUID"
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

          <label className="field field-wide">
            <span className="field-label">Posting notes *</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="posting-preview">
          <Barcode size={20} />
          <div>
            <strong>Base-unit posting preview</strong>
            <p>
              Posting appends immutable opening-stock ledger entries and immediately updates the
              rebuildable availability projection.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <SensitiveActionButton
            label="Review and post"
            effect="Posting appends permanent, immutable opening-stock ledger entries. Stock balances cannot be directly altered."
            onConfirm={handlePost}
            loading={submitting}
          />
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function StockAdjustmentScreen() {
  const router = useRouter();
  const [docNo, setDocNo] = useState(`ADJ-${new Date().getFullYear().toString()}-001`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">("DECREASE");
  const [reasonCode, setReasonCode] = useState<"DAMAGE" | "BREAKAGE" | "EXPIRY" | "CORRECTION">(
    "DAMAGE",
  );
  const [warehouseId, setWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("Physical damage identified during warehouse inspection");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getJson<Warehouse[]>("/warehouses").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setWarehouses(data);
        setWarehouseId(data[0].id);
      }
    });
  }, []);

  async function handlePost() {
    if (!docNo || !warehouseId || !variantId || !quantity || !notes) {
      setError("Please fill all required adjustment fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/stock-adjustments/post", {
        documentNumber: docNo.trim(),
        businessDate: date,
        direction,
        reasonCode,
        notes: notes.trim(),
        lines: [
          {
            variantId: variantId.trim(),
            warehouseId,
            packageQuantity: quantity.trim(),
          },
        ],
      });
      router.push("/inventory/ledger");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post adjustment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/adjustments" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Controlled posting</p>
          <h1>Stock adjustment</h1>
          <p>Reasoned increases or decreases with approval-ready audit context.</p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Variance resolution</p>
            <h2>Stock Adjustment Details</h2>
          </div>
          <span className="status-chip status-chip-warning">Audited Movement</span>
        </div>

        {error ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <div>
              <strong>Posting Error</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <div className="inventory-form">
          <label className="field">
            <span className="field-label">Document number *</span>
            <input className="input" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">Business date *</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Direction *</span>
            <select
              className="input"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "INCREASE" | "DECREASE")}
            >
              <option value="DECREASE">Decrease (Write-off / Loss)</option>
              <option value="INCREASE">Increase (Found stock / Correction)</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Reason code *</span>
            <select
              className="input"
              value={reasonCode}
              onChange={(e) =>
                setReasonCode(e.target.value as "DAMAGE" | "BREAKAGE" | "EXPIRY" | "CORRECTION")
              }
            >
              <option value="DAMAGE">DAMAGE</option>
              <option value="BREAKAGE">BREAKAGE</option>
              <option value="EXPIRY">EXPIRY</option>
              <option value="CORRECTION">CORRECTION</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Warehouse *</span>
            {warehouses.length > 0 ? (
              <select
                className="input"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder="Warehouse UUID"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              />
            )}
          </label>

          <label className="field">
            <span className="field-label">Variant UUID *</span>
            <input
              className="input"
              placeholder="Variant UUID"
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

          <label className="field field-wide">
            <span className="field-label">Required justification notes *</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="posting-preview">
          <Barcode size={20} />
          <div>
            <strong>Negative Stock Prevention</strong>
            <p>
              A decrease is automatically rejected by the server engine if eligible stock would
              become negative.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <SensitiveActionButton
            label="Review and post adjustment"
            effect="Posting appends an adjustment ledger entry and reconciles availability. This action is permanently recorded in the audit log."
            onConfirm={handlePost}
            loading={submitting}
          />
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function StockTransferScreen() {
  const router = useRouter();
  const [docNo, setDocNo] = useState(`TRF-${new Date().getFullYear().toString()}-001`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [srcWh, setSrcWh] = useState("");
  const [destWh, setDestWh] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("Inter-facility stock replenishment");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getJson<Warehouse[]>("/warehouses").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setWarehouses(data);
        setSrcWh(data[0].id);
        if (data.length > 1 && data[1]) setDestWh(data[1].id);
      }
    });
  }, []);

  async function handlePost() {
    if (!docNo || !srcWh || !destWh || !variantId || !quantity) {
      setError("Please complete all transfer fields.");
      return;
    }
    if (srcWh === destWh) {
      setError("Destination warehouse must be different from source warehouse.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/stock-transfers/post", {
        documentNumber: docNo.trim(),
        businessDate: date,
        sourceWarehouseId: srcWh,
        destinationWarehouseId: destWh,
        notes: notes.trim(),
        lines: [
          {
            variantId: variantId.trim(),
            packageQuantity: quantity.trim(),
          },
        ],
      });
      router.push("/inventory/ledger");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post transfer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/transfers" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Warehouse movement</p>
          <h1>Stock transfer</h1>
          <p>Linked transfer-out and transfer-in movements preserve every tracking dimension.</p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inter-facility movement</p>
            <h2>Transfer Details</h2>
          </div>
          <span className="status-chip status-chip-live">Linked transaction</span>
        </div>

        {error ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <div>
              <strong>Transfer Error</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <div className="inventory-form">
          <label className="field">
            <span className="field-label">Transfer number *</span>
            <input className="input" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">Business date *</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Source Warehouse *</span>
            <select className="input" value={srcWh} onChange={(e) => setSrcWh(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Destination Warehouse *</span>
            <select className="input" value={destWh} onChange={(e) => setDestWh(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Variant UUID *</span>
            <input
              className="input"
              placeholder="Variant UUID"
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

          <label className="field field-wide">
            <span className="field-label">Transfer notes</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="posting-preview">
          <Barcode size={20} />
          <div>
            <strong>Company Inventory Conservation</strong>
            <p>
              Posting creates balanced transfer-out and transfer-in records in one atomic
              transaction; total company stock is strictly preserved.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <SensitiveActionButton
            label="Review and post transfer"
            effect="Posting creates linked transfer movements across both warehouses atomically."
            onConfirm={handlePost}
            loading={submitting}
          />
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function StockCountScreen() {
  const router = useRouter();
  const [docNo, setDocNo] = useState(`COUNT-${new Date().getFullYear().toString()}-001`);
  const [warehouseId, setWarehouseId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [countedQty, setCountedQty] = useState("10");
  const [notes, setNotes] = useState("Periodic physical inventory count");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getJson<Warehouse[]>("/warehouses").then((data) => {
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        setWarehouses(data);
        setWarehouseId(data[0].id);
      }
    });
  }, []);

  async function handlePost() {
    if (!docNo || !warehouseId || !variantId || !countedQty) {
      setError("Please complete all count reconciliation fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postApi("/stock-counts/post", {
        documentNumber: docNo.trim(),
        warehouseId,
        notes: notes.trim(),
        lines: [
          {
            variantId: variantId.trim(),
            countedPackageQuantity: countedQty.trim(),
          },
        ],
      });
      router.push("/inventory/ledger");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post stock count");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <SubNav current="/inventory/counts" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Physical verification</p>
          <h1>Stock count</h1>
          <p>
            Compare counted packages to the immutable ledger snapshot and post only approved
            variance.
          </p>
        </div>
      </div>

      <section className="inventory-panel entry-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Reconciliation</p>
            <h2>Physical Count Form</h2>
          </div>
          <span className="status-chip status-chip-live">Audit Verification</span>
        </div>

        {error ? (
          <div
            className="signal-row"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "#ef4444" }}
          >
            <div>
              <strong>Count Error</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <div className="inventory-form">
          <label className="field">
            <span className="field-label">Count Document Number *</span>
            <input className="input" value={docNo} onChange={(e) => setDocNo(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">Warehouse *</span>
            <select
              className="input"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Variant UUID *</span>
            <input
              className="input"
              placeholder="Variant UUID"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Counted Package Quantity *</span>
            <input
              className="input"
              type="number"
              min="0"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
            />
          </label>

          <label className="field field-wide">
            <span className="field-label">Verification notes</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <SensitiveActionButton
            label="Reconcile and post count"
            effect="Approval preserves the original physical count and appends only the exact reconciliation movement."
            onConfirm={handlePost}
            loading={submitting}
          />
        </div>
      </section>

      <AuditFooter />
    </div>
  );
}

function LedgerScreen() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<LedgerEntry[]>("/stock/ledger")
      .then((data) => {
        if (active) {
          setEntries(Array.isArray(data) ? data : []);
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
      <SubNav current="/inventory/ledger" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Source of truth</p>
          <h1>Inventory ledger</h1>
          <p>Immutable, cursor-paginated movement history in base stock units.</p>
        </div>
        <a
          href={`${apiUrl}/stock/ledger/export`}
          target="_blank"
          rel="noreferrer"
          className="button button-secondary"
        >
          <Download size={17} />
          Export CSV
        </a>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Reference</th>
                <th scope="col">Variant ID</th>
                <th scope="col">Warehouse ID</th>
                <th scope="col">Base Quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    Loading stock ledger...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No inventory ledger entries yet.</p>
                    <Link
                      href="/inventory/opening-stock"
                      className="button button-secondary"
                      style={{ marginTop: "12px", display: "inline-flex" }}
                    >
                      Post opening stock
                    </Link>
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="status-chip">{row.movementType}</span>
                    </td>
                    <td>
                      <code>{row.referenceNumber}</code>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {row.variantId}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {row.warehouseId}
                    </td>
                    <td>
                      <strong
                        style={{
                          color: row.baseQuantity.startsWith("-") ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {row.baseQuantity.startsWith("-")
                          ? row.baseQuantity
                          : `+${row.baseQuantity}`}
                      </strong>
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

function AvailabilityScreen() {
  const [rows, setRows] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getJson<AvailabilityEntry[]>("/stock/availability")
      .then((data) => {
        if (active) {
          setRows(Array.isArray(data) ? data : []);
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
      <SubNav current="/inventory/availability" />
      <div className="page-heading inventory-heading">
        <div>
          <p className="eyebrow">Rebuildable projection</p>
          <h1>Stock availability</h1>
          <p>
            Current on-hand, reserved, and available quantities dynamically aggregated from the
            ledger.
          </p>
        </div>
      </div>

      <section className="inventory-panel table-panel">
        <div className="table-scroll">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">Variant ID</th>
                <th scope="col">Warehouse ID</th>
                <th scope="col">Location ID</th>
                <th scope="col">On Hand</th>
                <th scope="col">Reserved</th>
                <th scope="col">Available</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    Loading stock availability...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                    <Archive size={24} style={{ margin: "0 auto 8px" }} />
                    <p>No stock balances currently recorded.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.variantId}-${row.warehouseId}-${row.locationId ?? "none"}`}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {row.variantId}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {row.warehouseId}
                    </td>
                    <td>{row.locationId ?? "—"}</td>
                    <td>
                      <strong>{row.onHandQuantity}</strong>
                    </td>
                    <td>{row.reservedQuantity}</td>
                    <td>
                      <span className="status-chip status-chip-live">{row.availableQuantity}</span>
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

function AuditFooter() {
  return (
    <aside className="audit-note">
      <ShieldCheck size={18} />
      <div>
        <strong>Tenant and audit controls active</strong>
        <p>
          All data is resolved through the verified company context. Stock changes append immutable
          ledger entries; balances are never edited directly.
        </p>
      </div>
    </aside>
  );
}
