"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import { Button, Field, Input } from "@erp/ui";
import { postJson, safeReturnPath } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" | "reset" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint =
      mode === "forgot"
        ? "/auth/forgot-password"
        : mode === "reset"
          ? "/auth/reset-password"
          : `/auth/${mode}`;
    try {
      const response = await postJson(endpoint, data);
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "The request could not be completed.");
      }
      if (mode === "login" || mode === "register") {
        router.push(safeReturnPath(params.get("returnTo")));
        router.refresh();
      } else {
        setMessage(
          mode === "forgot"
            ? "If the account is eligible, reset instructions will be sent."
            : "Your password has been reset. You can sign in now.",
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const fields: Record<typeof mode, ReactNode> = {
    login: (
      <>
        <Field label="Email address">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
      </>
    ),
    register: (
      <>
        <Field label="Company name">
          <Input name="companyName" autoComplete="organization" required />
        </Field>
        <Field label="Your full name">
          <Input name="fullName" autoComplete="name" required />
        </Field>
        <Field label="Work email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="Use at least 12 characters.">
          <Input
            name="password"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </Field>
      </>
    ),
    forgot: (
      <Field label="Email address">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
    ),
    reset: (
      <>
        <Field label="Reset token">
          <Input name="token" autoComplete="off" required />
        </Field>
        <Field label="New password" hint="Use at least 12 characters.">
          <Input
            name="password"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </Field>
      </>
    ),
  };

  const labels = {
    login: "Sign in securely",
    register: "Create company account",
    forgot: "Send reset instructions",
    reset: "Reset password",
  } as const;
  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      {fields[mode]}
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
      <Button className="button-primary" type="submit" disabled={busy}>
        {busy ? "Please wait..." : labels[mode]}
      </Button>
    </form>
  );
}
