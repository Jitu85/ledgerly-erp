"use client";

import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  Home,
  Info,
  LockKeyhole,
  LogOut,
  Menu,
  PackageOpen,
  Receipt,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { PlatformAttribution } from "./platform-attribution";
import { getJson, postJson } from "@/lib/api";

type MeResponse = {
  user: { id: string; email: string; fullName: string; platformRole: string } | null;
  company: { id: string; name: string; slug: string; baseCurrency: string } | null;
  role: { membershipId: string; roleId: string; roleName: string } | null;
};

const readyNavigation = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/accounting", label: "Accounting", icon: WalletCards },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/people", label: "People", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/about", label: "System information", icon: Info },
  { href: "/dashboard#settings", label: "Company settings", icon: Settings },
];
const laterNavigation = [
  { label: "Payroll", icon: UserRound },
  { label: "Reports", icon: PackageOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [session, setSession] = useState<MeResponse | null>(null);

  useEffect(() => {
    let active = true;
    getJson<MeResponse>("/auth/me")
      .then((data) => {
        if (active) setSession(data);
      })
      .catch(() => {
        // Unauthenticated or network error
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await postJson("/auth/logout", {});
    } finally {
      router.push("/login");
    }
  }

  const companyName = session?.company?.name ?? "Ledgerly Enterprises";
  const userName = session?.user?.fullName ?? session?.user?.email ?? "Admin";
  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </button>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-heading">
          <Brand />
          <button
            className="sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          <div className="nav-list">
            {readyNavigation.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href === "/inventory" && pathname.startsWith("/inventory")) ||
                (item.href === "/purchases" && pathname.startsWith("/purchases")) ||
                (item.href === "/sales" && pathname.startsWith("/sales"));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link-active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="nav-rule" />
          <p className="nav-caption">Modules coming later</p>
          <div className="nav-list nav-disabled">
            {laterNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <span className="nav-link" key={item.label}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <LockKeyhole className="nav-lock" size={14} />
                </span>
              );
            })}
          </div>
        </nav>
      </aside>
      {open ? (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="workspace">
        <header className="topbar">
          <button className="company-switcher" type="button" title={`Company: ${companyName}`}>
            <Building2 size={18} />
            <span>{companyName}</span>
            <ChevronDown size={16} />
          </button>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div style={{ position: "relative" }}>
              <button
                className="profile-control"
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-expanded={profileMenuOpen}
              >
                <span className="avatar">{initials}</span>
                <span>{userName}</span>
                <ChevronDown size={15} />
              </button>
              {profileMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--card-bg, #1a202c)",
                    border: "1px solid var(--border-color, #2d3748)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    zIndex: 50,
                    minWidth: "160px",
                    padding: "6px",
                  }}
                >
                  <Link
                    href="/profile"
                    className="nav-link"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      display: "flex",
                      gap: "8px",
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <UserRound size={16} />
                    <span>Profile</span>
                  </Link>
                  <button
                    type="button"
                    className="nav-link"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      display: "flex",
                      gap: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <PlatformAttribution />
      </div>
    </div>
  );
}
