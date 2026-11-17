CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "category" text DEFAULT 'GENERAL' NOT NULL,
  "priority" text DEFAULT 'NORMAL' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "admin_reply" text,
  "replied_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "replied_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "support_messages_company_id_id_uq" UNIQUE ("company_id", "id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_messages_company_status_idx" ON "support_messages" ("company_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_messages_company_user_idx" ON "support_messages" ("company_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_messages_company_created_idx" ON "support_messages" ("company_id", "created_at");
--> statement-breakpoint
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS support_messages_tenant_isolation ON "support_messages";
CREATE POLICY support_messages_tenant_isolation ON "support_messages"
  AS RESTRICTIVE
  USING (
    company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
  )
  WITH CHECK (
    company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
  );
