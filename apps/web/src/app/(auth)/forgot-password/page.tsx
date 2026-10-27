import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-card">
      <h1>Reset your password</h1>
      <p className="auth-intro">
        Enter your email. We will send instructions if the account is eligible.
      </p>
      <Suspense>
        <AuthForm mode="forgot" />
      </Suspense>
      <Link className="text-link" href="/login">
        Back to sign in
      </Link>
    </div>
  );
}
