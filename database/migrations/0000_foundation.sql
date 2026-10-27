CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "company_status" AS ENUM ('PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CLOSING', 'CLOSED');
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "platform_role" AS ENUM ('NONE', 'SUPER_ADMIN');
CREATE TYPE "session_status" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "audit_outcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');
--> statement-breakpoint
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "password_hash" text,
  "status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
  "platform_role" "platform_role" DEFAULT 'NONE' NOT NULL,
  "email_verified_at" timestamptz,
  "failed_login_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamptz,
  "last_login_at" timestamptz,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "users_email_active_uidx" ON "users" (lower("email")) WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" "company_status" DEFAULT 'PENDING' NOT NULL,
  "base_currency" text DEFAULT 'USD' NOT NULL,
  "time_zone" text DEFAULT 'UTC' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "companies_slug_active_uidx" ON "companies" ("slug") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_protected" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "roles_company_id_id_uq" UNIQUE ("company_id", "id")
);
CREATE UNIQUE INDEX "roles_company_code_active_uidx" ON "roles" ("company_id", "code") WHERE "deleted_at" IS NULL;
CREATE INDEX "roles_company_idx" ON "roles" ("company_id");
--> statement-breakpoint
CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "description" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "role_id" uuid NOT NULL,
  "status" "membership_status" DEFAULT 'INVITED' NOT NULL,
  "invited_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "activated_at" timestamptz,
  "suspended_at" timestamptz,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "company_users_company_role_fk" FOREIGN KEY ("company_id", "role_id") REFERENCES "roles"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "company_users_company_user_active_uidx" ON "company_users" ("company_id", "user_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "company_users_user_status_idx" ON "company_users" ("user_id", "status");
CREATE INDEX "company_users_company_status_idx" ON "company_users" ("company_id", "status");
--> statement-breakpoint
CREATE TABLE "role_permissions" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE RESTRICT,
  "granted_at" timestamptz DEFAULT now() NOT NULL,
  "granted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "role_permissions_pk" PRIMARY KEY ("role_id", "permission_id"),
  CONSTRAINT "role_permissions_company_role_fk" FOREIGN KEY ("company_id", "role_id") REFERENCES "roles"("company_id", "id") ON DELETE CASCADE
);
CREATE INDEX "role_permissions_company_idx" ON "role_permissions" ("company_id");
--> statement-breakpoint
CREATE TABLE "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "active_company_id" uuid REFERENCES "companies"("id") ON DELETE SET NULL,
  "token_hash" text NOT NULL,
  "previous_token_hash" text,
  "token_family" uuid NOT NULL,
  "status" "session_status" DEFAULT 'ACTIVE' NOT NULL,
  "ip_address" inet,
  "user_agent" text,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "revoke_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "user_sessions_token_hash_uidx" ON "user_sessions" ("token_hash");
CREATE INDEX "user_sessions_user_status_idx" ON "user_sessions" ("user_id", "status");
CREATE INDEX "user_sessions_family_idx" ON "user_sessions" ("token_family");
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "requested_ip" inet,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" ("user_id", "expires_at");
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" ("user_id", "expires_at");
--> statement-breakpoint
CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid REFERENCES "companies"("id") ON DELETE RESTRICT,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "outcome" "audit_outcome" NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "request_id" text NOT NULL,
  "ip_address" inet,
  "user_agent" text,
  "occurred_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "audit_logs_company_time_idx" ON "audit_logs" ("company_id", "occurred_at");
CREATE INDEX "audit_logs_actor_time_idx" ON "audit_logs" ("actor_user_id", "occurred_at");
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" ("target_type", "target_id");
--> statement-breakpoint
CREATE TABLE "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "companies_tenant_isolation" ON "companies" FOR ALL USING ("id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK ("id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "roles_tenant_isolation" ON "roles" FOR ALL USING ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
ALTER TABLE "company_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "company_users_tenant_isolation" ON "company_users" FOR ALL USING ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_tenant_isolation" ON "role_permissions" FOR ALL USING ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs" FOR ALL USING ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK ("company_id" = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
--> statement-breakpoint
CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only';
END;
$$;
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
