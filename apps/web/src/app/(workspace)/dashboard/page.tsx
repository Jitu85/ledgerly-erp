"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  PackagePlus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import { getJson } from "@/lib/api";

type MeResponse = {
  user: { id: string; email: string; fullName: string; platformRole: string } | null;
  company: { id: string; name: string; slug: string; baseCurrency: string } | null;
  role: { membershipId: string; roleId: string; roleName: string } | null;
};

export default function DashboardPage() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [counts, setCounts] = useState({
    products: 0,
    warehouses: 0,
    purchaseOrders: 0,
    salesOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      getJson<MeResponse>("/auth/me"),
      getJson<unknown[]>("/products"),
      getJson<unknown[]>("/warehouses"),
      getJson<unknown[]>("/purchase/orders"),
      getJson<unknown[]>("/sales/orders"),
    ]).then(([meRes, prodRes, whRes, poRes, soRes]) => {
      if (!active) return;
      if (meRes.status === "fulfilled") setSession(meRes.value);
      setCounts({
        products:
          prodRes.status === "fulfilled" && Array.isArray(prodRes.value) ? prodRes.value.length : 0,
        warehouses:
          whRes.status === "fulfilled" && Array.isArray(whRes.value) ? whRes.value.length : 0,
        purchaseOrders:
          poRes.status === "fulfilled" && Array.isArray(poRes.value) ? poRes.value.length : 0,
        salesOrders:
          soRes.status === "fulfilled" && Array.isArray(soRes.value) ? soRes.value.length : 0,
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const userName = session?.user?.fullName ?? session?.user?.email ?? "Administrator";
  const companyName = session?.company?.name ?? "Ledgerly Enterprises";

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{companyName}</p>
          <h1>Welcome back, {userName}</h1>
          <p>
            Your enterprise ERP workspace is live with strict tenant isolation and double-entry
            integrity.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/inventory/products/new" className="button button-secondary">
            <PackagePlus size={17} />
            Add product
          </Link>
          <Link href="/inventory/opening-stock" className="button button-primary">
            <ArrowRight size={17} />
            Enter stock
          </Link>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: "24px" }}>
        <section className="metric-card">
          <span>
            <Boxes size={19} />
          </span>
          <p>Cataloged Products</p>
          <strong>{loading ? "..." : counts.products}</strong>
          <small>Products in catalog</small>
        </section>
        <section className="metric-card">
          <span>
            <Building2 size={19} />
          </span>
          <p>Warehouses</p>
          <strong>{loading ? "..." : counts.warehouses}</strong>
          <small>Storage facilities</small>
        </section>
        <section className="metric-card">
          <span>
            <ShoppingCart size={19} />
          </span>
          <p>Purchase Orders</p>
          <strong>{loading ? "..." : counts.purchaseOrders}</strong>
          <small>Procurement orders</small>
        </section>
        <section className="metric-card">
          <span>
            <ReceiptText size={19} />
          </span>
          <p>Sales Orders</p>
          <strong>{loading ? "..." : counts.salesOrders}</strong>
          <small>Fulfillment orders</small>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="foundation-panel">
          <h2>Quick Actions</h2>
          <div className="foundation-list">
            <Link className="foundation-row" href="/inventory/products">
              <span className="status-icon status-success">
                <Boxes size={18} />
              </span>
              <span>
                <strong>Inventory Management</strong>
                <small>View products, units, packaging, and stock ledger</small>
              </span>
              <ArrowRight size={17} />
            </Link>

            <Link className="foundation-row" href="/purchases">
              <span className="status-icon status-success">
                <ShoppingCart size={18} />
              </span>
              <span>
                <strong>Purchasing & Procurement</strong>
                <small>Manage suppliers, purchase orders, and goods receipts</small>
              </span>
              <ArrowRight size={17} />
            </Link>

            <Link className="foundation-row" href="/sales">
              <span className="status-icon status-success">
                <ReceiptText size={18} />
              </span>
              <span>
                <strong>Sales & Fulfillment</strong>
                <small>Manage customers, sales orders, deliveries, and invoicing</small>
              </span>
              <ArrowRight size={17} />
            </Link>

            <Link className="foundation-row" href="/people">
              <span className="status-icon status-success">
                <UsersRound size={18} />
              </span>
              <span>
                <strong>Team & Permissions</strong>
                <small>Manage staff memberships and role-based permissions</small>
              </span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <section className="inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Integrity Guarantees</p>
              <h2>System Security & Compliance</h2>
            </div>
            <ShieldCheck size={20} color="#22c55e" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px 0" }}>
            <div className="setup-row">
              <Check size={18} color="#22c55e" />
              <span>Multi-Tenant Row-Level Security</span>
              <small>Enforced</small>
            </div>
            <div className="setup-row">
              <Check size={18} color="#22c55e" />
              <span>Immutable Append-Only Stock Ledger</span>
              <small>Active</small>
            </div>
            <div className="setup-row">
              <Check size={18} color="#22c55e" />
              <span>CSRF Cookie & Header Cryptographic Binding</span>
              <small>Protected</small>
            </div>
            <div className="setup-row">
              <Check size={18} color="#22c55e" />
              <span>Argon2id Salted Credential Hashing</span>
              <small>Secured</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
