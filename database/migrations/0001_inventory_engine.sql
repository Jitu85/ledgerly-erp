CREATE TYPE "measurement_dimension" AS ENUM ('COUNT', 'MASS', 'VOLUME', 'LENGTH', 'AREA', 'CUSTOM');
CREATE TYPE "inventory_tracking_mode" AS ENUM ('NONE', 'BATCH', 'SERIAL');
CREATE TYPE "inventory_transaction_type" AS ENUM ('OPENING_STOCK', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'TRANSFER_OUT', 'TRANSFER_IN', 'COUNT_RECONCILIATION_INCREASE', 'COUNT_RECONCILIATION_DECREASE', 'PURCHASE_RECEIPT', 'PURCHASE_RETURN', 'SALES_DISPATCH', 'SALES_RETURN', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT');
CREATE TYPE "inventory_document_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED', 'REJECTED');
CREATE TYPE "stock_batch_status" AS ENUM ('AVAILABLE', 'QUARANTINED', 'BLOCKED', 'EXPIRED', 'RECALLED');
CREATE TYPE "serial_number_status" AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'ISSUED', 'QUARANTINED', 'SCRAPPED');
--> statement-breakpoint
CREATE TABLE "product_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "parent_id" uuid,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "product_categories_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "product_categories_company_parent_fk" FOREIGN KEY ("company_id", "parent_id") REFERENCES "product_categories"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "product_categories_company_code_active_uidx" ON "product_categories" ("company_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "product_categories_company_parent_idx" ON "product_categories" ("company_id", "parent_id");
--> statement-breakpoint
CREATE TABLE "brands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "brands_company_id_id_uq" UNIQUE ("company_id", "id")
);
CREATE UNIQUE INDEX "brands_company_code_active_uidx" ON "brands" ("company_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "brands_company_name_idx" ON "brands" ("company_id", "name");
--> statement-breakpoint
CREATE TABLE "units_of_measurement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "symbol" text NOT NULL,
  "dimension" "measurement_dimension" NOT NULL,
  "decimal_scale" integer DEFAULT 0 NOT NULL CHECK ("decimal_scale" BETWEEN 0 AND 8),
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "units_of_measurement_company_id_id_uq" UNIQUE ("company_id", "id")
);
CREATE UNIQUE INDEX "units_of_measurement_company_code_active_uidx" ON "units_of_measurement" ("company_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "units_of_measurement_company_dimension_idx" ON "units_of_measurement" ("company_id", "dimension");
--> statement-breakpoint
CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "category_id" uuid,
  "brand_id" uuid,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "product_type" text DEFAULT 'GOODS' NOT NULL,
  "image_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "products_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "products_company_category_fk" FOREIGN KEY ("company_id", "category_id") REFERENCES "product_categories"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "products_company_brand_fk" FOREIGN KEY ("company_id", "brand_id") REFERENCES "brands"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "products_company_code_active_uidx" ON "products" ("company_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "products_company_name_idx" ON "products" ("company_id", "name");
CREATE INDEX "products_company_category_idx" ON "products" ("company_id", "category_id");
--> statement-breakpoint
CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "product_id" uuid NOT NULL,
  "base_unit_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "stock_tracked" boolean DEFAULT true NOT NULL,
  "tracking_mode" "inventory_tracking_mode" DEFAULT 'NONE' NOT NULL,
  "expiry_tracking" boolean DEFAULT false NOT NULL,
  "allow_negative_stock" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "product_variants_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "product_variants_company_product_fk" FOREIGN KEY ("company_id", "product_id") REFERENCES "products"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "product_variants_company_base_unit_fk" FOREIGN KEY ("company_id", "base_unit_id") REFERENCES "units_of_measurement"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "product_variants_company_sku_active_uidx" ON "product_variants" ("company_id", "sku") WHERE "archived_at" IS NULL;
CREATE INDEX "product_variants_company_product_idx" ON "product_variants" ("company_id", "product_id");
--> statement-breakpoint
CREATE TABLE "product_packaging_levels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "variant_id" uuid NOT NULL,
  "parent_packaging_level_id" uuid,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "conversion_quantity" numeric(24,8) NOT NULL CHECK ("conversion_quantity" > 0),
  "base_unit_equivalent" numeric(24,8) NOT NULL CHECK ("base_unit_equivalent" > 0),
  "barcode" text,
  "purchase_price" numeric(20,4),
  "selling_price" numeric(20,4),
  "weight" numeric(20,6),
  "length" numeric(20,6),
  "width" numeric(20,6),
  "height" numeric(20,6),
  "active" boolean DEFAULT true NOT NULL,
  "effective_from" date DEFAULT CURRENT_DATE NOT NULL,
  "effective_to" date,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "product_packaging_levels_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "product_packaging_levels_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "product_packaging_levels_company_parent_fk" FOREIGN KEY ("company_id", "parent_packaging_level_id") REFERENCES "product_packaging_levels"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "product_packaging_levels_variant_code_active_uidx" ON "product_packaging_levels" ("company_id", "variant_id", "code") WHERE "archived_at" IS NULL AND "active" = true;
CREATE INDEX "product_packaging_levels_company_variant_idx" ON "product_packaging_levels" ("company_id", "variant_id");
COMMENT ON COLUMN "product_packaging_levels"."base_unit_equivalent" IS 'Authoritative direct conversion to the immutable variant base unit; posting snapshots this value.';
--> statement-breakpoint
CREATE TABLE "product_barcodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "variant_id" uuid NOT NULL,
  "packaging_level_id" uuid,
  "value" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "product_barcodes_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "product_barcodes_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "product_barcodes_company_packaging_fk" FOREIGN KEY ("company_id", "packaging_level_id") REFERENCES "product_packaging_levels"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "product_barcodes_company_value_active_uidx" ON "product_barcodes" ("company_id", "value") WHERE "archived_at" IS NULL AND "active" = true;
CREATE INDEX "product_barcodes_company_variant_idx" ON "product_barcodes" ("company_id", "variant_id");
--> statement-breakpoint
CREATE TABLE "warehouses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "location_tracking" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "warehouses_company_id_id_uq" UNIQUE ("company_id", "id")
);
CREATE UNIQUE INDEX "warehouses_company_code_active_uidx" ON "warehouses" ("company_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "warehouses_company_name_idx" ON "warehouses" ("company_id", "name");
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "warehouse_id" uuid NOT NULL,
  "parent_location_id" uuid,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "location_type" text DEFAULT 'BIN' NOT NULL,
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "warehouse_locations_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "warehouse_locations_company_warehouse_fk" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "warehouse_locations_company_parent_fk" FOREIGN KEY ("company_id", "parent_location_id") REFERENCES "warehouse_locations"("company_id", "id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "warehouse_locations_warehouse_code_active_uidx" ON "warehouse_locations" ("company_id", "warehouse_id", "code") WHERE "archived_at" IS NULL;
CREATE INDEX "warehouse_locations_company_warehouse_idx" ON "warehouse_locations" ("company_id", "warehouse_id");
--> statement-breakpoint
CREATE TABLE "stock_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "variant_id" uuid NOT NULL,
  "batch_number" text NOT NULL,
  "manufacture_date" date,
  "expiry_date" date,
  "status" "stock_batch_status" DEFAULT 'AVAILABLE' NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_batches_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "stock_batches_company_variant_number_uq" UNIQUE ("company_id", "variant_id", "batch_number"),
  CONSTRAINT "stock_batches_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_batches_company_expiry_idx" ON "stock_batches" ("company_id", "expiry_date");
--> statement-breakpoint
CREATE TABLE "serial_numbers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "variant_id" uuid NOT NULL,
  "serial_number" text NOT NULL,
  "status" "serial_number_status" DEFAULT 'AVAILABLE' NOT NULL,
  "warehouse_id" uuid,
  "location_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "serial_numbers_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "serial_numbers_company_variant_serial_uq" UNIQUE ("company_id", "variant_id", "serial_number"),
  CONSTRAINT "serial_numbers_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "serial_numbers_company_warehouse_fk" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "serial_numbers_company_location_fk" FOREIGN KEY ("company_id", "location_id") REFERENCES "warehouse_locations"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "serial_numbers_company_status_idx" ON "serial_numbers" ("company_id", "status");
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "transaction_type" "inventory_transaction_type" NOT NULL,
  "reference_type" text NOT NULL,
  "reference_id" uuid,
  "reference_number" text NOT NULL,
  "business_date" date NOT NULL,
  "posting_batch_id" uuid NOT NULL,
  "reversal_of_transaction_id" uuid,
  "notes" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "posted_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_transactions_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "inventory_transactions_company_posting_batch_uq" UNIQUE ("company_id", "posting_batch_id"),
  CONSTRAINT "inventory_transactions_company_reversal_fk" FOREIGN KEY ("company_id", "reversal_of_transaction_id") REFERENCES "inventory_transactions"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "inventory_transactions_company_posted_idx" ON "inventory_transactions" ("company_id", "posted_at");
CREATE INDEX "inventory_transactions_company_reference_idx" ON "inventory_transactions" ("company_id", "reference_type", "reference_id");
--> statement-breakpoint
CREATE TABLE "inventory_transaction_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "transaction_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "packaging_level_id" uuid,
  "entered_quantity" numeric(24,8) NOT NULL CHECK ("entered_quantity" > 0),
  "conversion_factor_snapshot" numeric(24,8) NOT NULL CHECK ("conversion_factor_snapshot" > 0),
  "base_quantity" numeric(24,8) NOT NULL CHECK ("base_quantity" <> 0),
  "warehouse_id" uuid NOT NULL,
  "location_id" uuid,
  "batch_id" uuid,
  "serial_number_id" uuid,
  "unit_cost" numeric(20,6),
  "total_value" numeric(24,4),
  "notes" text,
  CONSTRAINT "inventory_transaction_lines_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "inventory_transaction_lines_company_transaction_fk" FOREIGN KEY ("company_id", "transaction_id") REFERENCES "inventory_transactions"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_packaging_fk" FOREIGN KEY ("company_id", "packaging_level_id") REFERENCES "product_packaging_levels"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_warehouse_fk" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_location_fk" FOREIGN KEY ("company_id", "location_id") REFERENCES "warehouse_locations"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_batch_fk" FOREIGN KEY ("company_id", "batch_id") REFERENCES "stock_batches"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_transaction_lines_company_serial_fk" FOREIGN KEY ("company_id", "serial_number_id") REFERENCES "serial_numbers"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "inventory_transaction_lines_company_variant_time_idx" ON "inventory_transaction_lines" ("company_id", "variant_id", "transaction_id");
CREATE INDEX "inventory_transaction_lines_company_warehouse_idx" ON "inventory_transaction_lines" ("company_id", "warehouse_id");
CREATE INDEX "inventory_transaction_lines_company_batch_idx" ON "inventory_transaction_lines" ("company_id", "batch_id");
CREATE INDEX "inventory_transaction_lines_company_serial_idx" ON "inventory_transaction_lines" ("company_id", "serial_number_id");
COMMENT ON COLUMN "inventory_transaction_lines"."conversion_factor_snapshot" IS 'Immutable package-to-base conversion used when this movement posted.';
COMMENT ON COLUMN "inventory_transaction_lines"."base_quantity" IS 'Signed exact quantity in the variant immutable base stock unit.';
--> statement-breakpoint
CREATE TABLE "inventory_balance_projections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "dimension_key" text NOT NULL,
  "variant_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "location_id" uuid,
  "batch_id" uuid,
  "quantity_base" numeric(24,8) DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_balance_projections_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "inventory_balance_projections_company_dimension_uq" UNIQUE ("company_id", "dimension_key"),
  CONSTRAINT "inventory_balance_projections_company_variant_fk" FOREIGN KEY ("company_id", "variant_id") REFERENCES "product_variants"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_balance_projections_company_warehouse_fk" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "inventory_balance_projections_company_variant_idx" ON "inventory_balance_projections" ("company_id", "variant_id");
CREATE INDEX "inventory_balance_projections_company_warehouse_idx" ON "inventory_balance_projections" ("company_id", "warehouse_id");
COMMENT ON TABLE "inventory_balance_projections" IS 'Rebuildable read model only; inventory_transactions and lines are authoritative.';
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "document_number" text NOT NULL,
  "status" "inventory_document_status" DEFAULT 'DRAFT' NOT NULL,
  "reason_code" text NOT NULL,
  "notes" text NOT NULL,
  "business_date" date NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "posted_transaction_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_adjustments_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "stock_adjustments_company_number_uq" UNIQUE ("company_id", "document_number")
);
CREATE INDEX "stock_adjustments_company_status_date_idx" ON "stock_adjustments" ("company_id", "status", "business_date");
CREATE TABLE "stock_adjustment_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "adjustment_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "packaging_level_id" uuid,
  "package_quantity" numeric(24,8) NOT NULL,
  "conversion_factor_snapshot" numeric(24,8) NOT NULL,
  "base_quantity" numeric(24,8) NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "location_id" uuid,
  "batch_id" uuid,
  "serial_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT "stock_adjustment_lines_company_adjustment_fk" FOREIGN KEY ("company_id", "adjustment_id") REFERENCES "stock_adjustments"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_adjustment_lines_company_adjustment_idx" ON "stock_adjustment_lines" ("company_id", "adjustment_id");
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "document_number" text NOT NULL,
  "status" "inventory_document_status" DEFAULT 'PENDING' NOT NULL,
  "source_warehouse_id" uuid NOT NULL,
  "destination_warehouse_id" uuid NOT NULL,
  "business_date" date NOT NULL,
  "notes" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "dispatched_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "received_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_transfers_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "stock_transfers_company_number_uq" UNIQUE ("company_id", "document_number"),
  CONSTRAINT "stock_transfers_different_warehouse_ck" CHECK ("source_warehouse_id" <> "destination_warehouse_id"),
  CONSTRAINT "stock_transfers_company_source_fk" FOREIGN KEY ("company_id", "source_warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "stock_transfers_company_destination_fk" FOREIGN KEY ("company_id", "destination_warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_transfers_company_status_date_idx" ON "stock_transfers" ("company_id", "status", "business_date");
CREATE TABLE "stock_transfer_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "transfer_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "packaging_level_id" uuid,
  "package_quantity" numeric(24,8) NOT NULL,
  "conversion_factor_snapshot" numeric(24,8) NOT NULL,
  "base_quantity" numeric(24,8) NOT NULL,
  "source_location_id" uuid,
  "destination_location_id" uuid,
  "batch_id" uuid,
  "serial_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT "stock_transfer_lines_company_transfer_fk" FOREIGN KEY ("company_id", "transfer_id") REFERENCES "stock_transfers"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_transfer_lines_company_transfer_idx" ON "stock_transfer_lines" ("company_id", "transfer_id");
--> statement-breakpoint
CREATE TABLE "stock_counts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "document_number" text NOT NULL,
  "status" "inventory_document_status" DEFAULT 'DRAFT' NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "snapshot_at" timestamptz NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_counts_company_id_id_uq" UNIQUE ("company_id", "id"),
  CONSTRAINT "stock_counts_company_number_uq" UNIQUE ("company_id", "document_number"),
  CONSTRAINT "stock_counts_company_warehouse_fk" FOREIGN KEY ("company_id", "warehouse_id") REFERENCES "warehouses"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_counts_company_status_snapshot_idx" ON "stock_counts" ("company_id", "status", "snapshot_at");
CREATE TABLE "stock_count_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE RESTRICT,
  "stock_count_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "packaging_level_id" uuid,
  "location_id" uuid,
  "batch_id" uuid,
  "system_quantity_base" numeric(24,8) NOT NULL,
  "counted_package_quantity" numeric(24,8),
  "conversion_factor_snapshot" numeric(24,8),
  "counted_quantity_base" numeric(24,8),
  "variance_quantity_base" numeric(24,8),
  "counted_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "counted_at" timestamptz,
  "reason" text,
  CONSTRAINT "stock_count_lines_company_count_fk" FOREIGN KEY ("company_id", "stock_count_id") REFERENCES "stock_counts"("company_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "stock_count_lines_company_count_idx" ON "stock_count_lines" ("company_id", "stock_count_id");
--> statement-breakpoint
CREATE FUNCTION prevent_inventory_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'inventory ledger is append-only';
END;
$$;
CREATE TRIGGER inventory_transactions_immutable BEFORE UPDATE OR DELETE ON "inventory_transactions" FOR EACH ROW EXECUTE FUNCTION prevent_inventory_ledger_mutation();
CREATE TRIGGER inventory_transaction_lines_immutable BEFORE UPDATE OR DELETE ON "inventory_transaction_lines" FOR EACH ROW EXECUTE FUNCTION prevent_inventory_ledger_mutation();
--> statement-breakpoint
CREATE FUNCTION protect_inventory_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.base_unit_id IS DISTINCT FROM OLD.base_unit_id AND EXISTS (
    SELECT 1 FROM inventory_transaction_lines WHERE company_id = OLD.company_id AND variant_id = OLD.id
  ) THEN RAISE EXCEPTION 'base unit cannot change after inventory movement'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_variants_protect_base_unit BEFORE UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION protect_inventory_identity();
CREATE FUNCTION protect_packaging_conversion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.base_unit_equivalent IS DISTINCT FROM OLD.base_unit_equivalent OR NEW.conversion_quantity IS DISTINCT FROM OLD.conversion_quantity) AND EXISTS (
    SELECT 1 FROM inventory_transaction_lines WHERE company_id = OLD.company_id AND packaging_level_id = OLD.id
  ) THEN RAISE EXCEPTION 'used packaging conversion must be versioned, not changed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_packaging_levels_protect_history BEFORE UPDATE ON "product_packaging_levels" FOR EACH ROW EXECUTE FUNCTION protect_packaging_conversion();
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'product_categories','brands','units_of_measurement','products','product_variants',
    'product_packaging_levels','product_barcodes','warehouses','warehouse_locations',
    'inventory_transactions','inventory_transaction_lines','inventory_balance_projections',
    'stock_batches','serial_numbers','stock_adjustments','stock_adjustment_lines',
    'stock_transfers','stock_transfer_lines','stock_counts','stock_count_lines'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid) WITH CHECK (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid)',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;