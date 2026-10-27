import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformAttribution } from "@/components/platform-attribution";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </section>
      <PlatformAttribution />
    </main>
  );
}
