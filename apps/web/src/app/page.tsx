import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformAttribution } from "@/components/platform-attribution";

export default function Home() {
  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <Brand />
        <ThemeToggle />
      </div>
      <section className="auth-stage">
        <div className="auth-aside" aria-hidden="true">
          <div className="auth-aside-copy">
            <h1>One secure workspace for every company.</h1>
            <p>
              Tenant-aware access, clear roles, and an audit-ready foundation from the first
              sign-in.
            </p>
          </div>
          <div className="auth-aside-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="auth-intro">Sign in to your company workspace.</p>
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
          <Link className="text-link" href="/forgot-password">
            Forgot password?
          </Link>
          <div className="auth-divider">
            <span>New to Ledgerly?</span>
          </div>
          <Link className="button button-secondary" href="/register">
            Create a company account
          </Link>
        </div>
      </section>
      <PlatformAttribution />
    </main>
  );
}
