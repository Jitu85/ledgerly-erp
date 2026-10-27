import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
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
  );
}
