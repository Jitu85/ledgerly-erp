import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function ResetPasswordPage() {
  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      <p className="auth-intro">
        This foundation screen accepts the secure reset token delivered by the configured email
        provider.
      </p>
      <Suspense>
        <AuthForm mode="reset" />
      </Suspense>
      <Link className="text-link" href="/login">
        Back to sign in
      </Link>
    </div>
  );
}
