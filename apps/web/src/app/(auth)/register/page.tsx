import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <div className="auth-card auth-card-wide">
      <h1>Create your company</h1>
      <p className="auth-intro">
        Set up the owner account. Company access remains isolated by design.
      </p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
      <p className="auth-footnote">
        By continuing, you acknowledge that email verification and company activation may be
        required.
      </p>
      <Link className="text-link" href="/login">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
