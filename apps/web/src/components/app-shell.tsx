"use client";

import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  Home,
  Info,
  LockKeyhole,
  Menu,
  PackageOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { PlatformAttribution } from "./platform-attribution";

const readyNavigation = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/people", label: "People", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/about", label: "System information", icon: Info },
  { href: "/dashboard#settings", label: "Company settings", icon: Settings },
];
const laterNavigation = [
  { label: "Sales", icon: ReceiptText },
  { label: "Accounting", icon: WalletCards },
  { label: "Payroll", icon: UserRound },
  { label: "Reports", icon: PackageOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
          <button className="company-switcher" type="button">
            <Building2 size={18} />
            <span>Northstar Trading</span>
            <ChevronDown size={16} />
          </button>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <Link className="profile-control" href="/profile">
              <span className="avatar">AP</span>
              <span>Amina Patel</span>
              <ChevronDown size={15} />
            </Link>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <PlatformAttribution />
      </div>
    </div>
  );
}
