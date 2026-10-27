import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies, users } from "./schema.js";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
};

const archiveColumns = {
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: uuid("archived_by").references(() => users.id, { onDelete: "set null" }),
};
const documentAuditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
};

export const measurementDimension = pgEnum("measurement_dimension", [
  "COUNT",
  "MASS",
  "VOLUME",
  "LENGTH",
  "AREA",
  "CUSTOM",
]);
export const inventoryTrackingMode = pgEnum("inventory_tracking_mode", ["NONE", "BATCH", "SERIAL"]);
export const inventoryTransactionType = pgEnum("inventory_transaction_type", [
  "OPENING_STOCK",
  "ADJUSTMENT_INCREASE",
  "ADJUSTMENT_DECREASE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "COUNT_RECONCILIATION_INCREASE",
  "COUNT_RECONCILIATION_DECREASE",
  "PURCHASE_RECEIPT",
  "PURCHASE_RETURN",
  "SALES_DISPATCH",
  "SALES_RETURN",
  "PRODUCTION_CONSUMPTION",
  "PRODUCTION_OUTPUT",
]);
export const inventoryDocumentStatus = pgEnum("inventory_document_status", [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "POSTED",
  "PENDING",
  "DISPATCHED",
  "RECEIVED",
  "CANCELLED",
  "REJECTED",
]);
export const stockBatchStatus = pgEnum("stock_batch_status", [
  "AVAILABLE",
  "QUARANTINED",
  "BLOCKED",
  "EXPIRED",
  "RECALLED",
]);
export const serialNumberStatus = pgEnum("serial_number_status", [
  "AVAILABLE",
  "IN_TRANSIT",
  "ISSUED",
  "QUARANTINED",
  "SCRAPPED",
]);

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    parentId: uuid("parent_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("product_categories_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("product_categories_company_code_active_uidx")
      .on(table.companyId, table.code)
      .where(sql`${table.archivedAt} is null`),
    index("product_categories_company_parent_idx").on(table.companyId, table.parentId),
    foreignKey({
      columns: [table.companyId, table.parentId],
      foreignColumns: [table.companyId, table.id],
      name: "product_categories_company_parent_fk",
    }).onDelete("restrict"),
  ],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("brands_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("brands_company_code_active_uidx")
      .on(table.companyId, table.code)
      .where(sql`${table.archivedAt} is null`),
    index("brands_company_name_idx").on(table.companyId, table.name),
  ],
);

export const unitsOfMeasurement = pgTable(
  "units_of_measurement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    dimension: measurementDimension("dimension").notNull(),
    decimalScale: integer("decimal_scale").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("units_of_measurement_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("units_of_measurement_company_code_active_uidx")
      .on(table.companyId, table.code)
      .where(sql`${table.archivedAt} is null`),
    check("units_of_measurement_decimal_scale_ck", sql`${table.decimalScale} between 0 and 8`),
    index("units_of_measurement_company_dimension_idx").on(table.companyId, table.dimension),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id"),
    brandId: uuid("brand_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    productType: text("product_type").default("GOODS").notNull(),
    imageReferences: jsonb("image_references").$type<string[]>().default([]).notNull(),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("products_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("products_company_code_active_uidx")
      .on(table.companyId, table.code)
      .where(sql`${table.archivedAt} is null`),
    index("products_company_name_idx").on(table.companyId, table.name),
    index("products_company_category_idx").on(table.companyId, table.categoryId),
    foreignKey({
      columns: [table.companyId, table.categoryId],
      foreignColumns: [productCategories.companyId, productCategories.id],
      name: "products_company_category_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.brandId],
      foreignColumns: [brands.companyId, brands.id],
      name: "products_company_brand_fk",
    }).onDelete("restrict"),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    productId: uuid("product_id").notNull(),
    baseUnitId: uuid("base_unit_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    attributes: jsonb("attributes").$type<Record<string, string>>().default({}).notNull(),
    stockTracked: boolean("stock_tracked").default(true).notNull(),
    trackingMode: inventoryTrackingMode("tracking_mode").default("NONE").notNull(),
    expiryTracking: boolean("expiry_tracking").default(false).notNull(),
    allowNegativeStock: boolean("allow_negative_stock").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("product_variants_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("product_variants_company_sku_active_uidx")
      .on(table.companyId, table.sku)
      .where(sql`${table.archivedAt} is null`),
    index("product_variants_company_product_idx").on(table.companyId, table.productId),
    foreignKey({
      columns: [table.companyId, table.productId],
      foreignColumns: [products.companyId, products.id],
      name: "product_variants_company_product_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.baseUnitId],
      foreignColumns: [unitsOfMeasurement.companyId, unitsOfMeasurement.id],
      name: "product_variants_company_base_unit_fk",
    }).onDelete("restrict"),
  ],
);

export const productPackagingLevels = pgTable(
  "product_packaging_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    parentPackagingLevelId: uuid("parent_packaging_level_id"),
    name: text("name").notNull(),
    code: text("code").notNull(),
    conversionQuantity: numeric("conversion_quantity", { precision: 24, scale: 8 }).notNull(),
    baseUnitEquivalent: numeric("base_unit_equivalent", { precision: 24, scale: 8 }).notNull(),
    barcode: text("barcode"),
    purchasePrice: numeric("purchase_price", { precision: 20, scale: 4 }),
    sellingPrice: numeric("selling_price", { precision: 20, scale: 4 }),
    weight: numeric("weight", { precision: 20, scale: 6 }),
    length: numeric("length", { precision: 20, scale: 6 }),
    width: numeric("width", { precision: 20, scale: 6 }),
    height: numeric("height", { precision: 20, scale: 6 }),
    active: boolean("active").default(true).notNull(),
    effectiveFrom: date("effective_from").defaultNow().notNull(),
    effectiveTo: date("effective_to"),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("product_packaging_levels_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("product_packaging_levels_variant_code_active_uidx")
      .on(table.companyId, table.variantId, table.code)
      .where(sql`${table.archivedAt} is null and ${table.active} = true`),
    check(
      "product_packaging_levels_conversion_positive_ck",
      sql`${table.conversionQuantity} > 0 and ${table.baseUnitEquivalent} > 0`,
    ),
    index("product_packaging_levels_company_variant_idx").on(table.companyId, table.variantId),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "product_packaging_levels_company_variant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.parentPackagingLevelId],
      foreignColumns: [table.companyId, table.id],
      name: "product_packaging_levels_company_parent_fk",
    }).onDelete("restrict"),
  ],
);

export const productBarcodes = pgTable(
  "product_barcodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    packagingLevelId: uuid("packaging_level_id"),
    value: text("value").notNull(),
    active: boolean("active").default(true).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("product_barcodes_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("product_barcodes_company_value_active_uidx")
      .on(table.companyId, table.value)
      .where(sql`${table.archivedAt} is null and ${table.active} = true`),
    index("product_barcodes_company_variant_idx").on(table.companyId, table.variantId),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "product_barcodes_company_variant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.packagingLevelId],
      foreignColumns: [productPackagingLevels.companyId, productPackagingLevels.id],
      name: "product_barcodes_company_packaging_fk",
    }).onDelete("restrict"),
  ],
);

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    locationTracking: boolean("location_tracking").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("warehouses_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("warehouses_company_code_active_uidx")
      .on(table.companyId, table.code)
      .where(sql`${table.archivedAt} is null`),
    index("warehouses_company_name_idx").on(table.companyId, table.name),
  ],
);

export const warehouseLocations = pgTable(
  "warehouse_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    warehouseId: uuid("warehouse_id").notNull(),
    parentLocationId: uuid("parent_location_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    locationType: text("location_type").default("BIN").notNull(),
    ...archiveColumns,
    ...auditColumns,
  },
  (table) => [
    unique("warehouse_locations_company_id_id_uq").on(table.companyId, table.id),
    uniqueIndex("warehouse_locations_warehouse_code_active_uidx")
      .on(table.companyId, table.warehouseId, table.code)
      .where(sql`${table.archivedAt} is null`),
    index("warehouse_locations_company_warehouse_idx").on(table.companyId, table.warehouseId),
    foreignKey({
      columns: [table.companyId, table.warehouseId],
      foreignColumns: [warehouses.companyId, warehouses.id],
      name: "warehouse_locations_company_warehouse_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.parentLocationId],
      foreignColumns: [table.companyId, table.id],
      name: "warehouse_locations_company_parent_fk",
    }).onDelete("restrict"),
  ],
);

export const stockBatches = pgTable(
  "stock_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    batchNumber: text("batch_number").notNull(),
    manufactureDate: date("manufacture_date"),
    expiryDate: date("expiry_date"),
    status: stockBatchStatus("status").default("AVAILABLE").notNull(),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    unique("stock_batches_company_id_id_uq").on(table.companyId, table.id),
    unique("stock_batches_company_variant_number_uq").on(
      table.companyId,
      table.variantId,
      table.batchNumber,
    ),
    index("stock_batches_company_expiry_idx").on(table.companyId, table.expiryDate),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "stock_batches_company_variant_fk",
    }).onDelete("restrict"),
  ],
);

export const serialNumbers = pgTable(
  "serial_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    serialNumber: text("serial_number").notNull(),
    status: serialNumberStatus("status").default("AVAILABLE").notNull(),
    warehouseId: uuid("warehouse_id"),
    locationId: uuid("location_id"),
    ...auditColumns,
  },
  (table) => [
    unique("serial_numbers_company_id_id_uq").on(table.companyId, table.id),
    unique("serial_numbers_company_variant_serial_uq").on(
      table.companyId,
      table.variantId,
      table.serialNumber,
    ),
    index("serial_numbers_company_status_idx").on(table.companyId, table.status),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "serial_numbers_company_variant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.warehouseId],
      foreignColumns: [warehouses.companyId, warehouses.id],
      name: "serial_numbers_company_warehouse_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.locationId],
      foreignColumns: [warehouseLocations.companyId, warehouseLocations.id],
      name: "serial_numbers_company_location_fk",
    }).onDelete("restrict"),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    transactionType: inventoryTransactionType("transaction_type").notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id"),
    referenceNumber: text("reference_number").notNull(),
    businessDate: date("business_date").notNull(),
    postingBatchId: uuid("posting_batch_id").notNull(),
    reversalOfTransactionId: uuid("reversal_of_transaction_id"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    postedAt: timestamp("posted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("inventory_transactions_company_id_id_uq").on(table.companyId, table.id),
    unique("inventory_transactions_company_posting_batch_uq").on(
      table.companyId,
      table.postingBatchId,
    ),
    index("inventory_transactions_company_posted_idx").on(table.companyId, table.postedAt),
    index("inventory_transactions_company_reference_idx").on(
      table.companyId,
      table.referenceType,
      table.referenceId,
    ),
    foreignKey({
      columns: [table.companyId, table.reversalOfTransactionId],
      foreignColumns: [table.companyId, table.id],
      name: "inventory_transactions_company_reversal_fk",
    }).onDelete("restrict"),
  ],
);

export const inventoryTransactionLines = pgTable(
  "inventory_transaction_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    transactionId: uuid("transaction_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    packagingLevelId: uuid("packaging_level_id"),
    enteredQuantity: numeric("entered_quantity", { precision: 24, scale: 8 }).notNull(),
    conversionFactorSnapshot: numeric("conversion_factor_snapshot", {
      precision: 24,
      scale: 8,
    }).notNull(),
    baseQuantity: numeric("base_quantity", { precision: 24, scale: 8 }).notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id"),
    batchId: uuid("batch_id"),
    serialNumberId: uuid("serial_number_id"),
    unitCost: numeric("unit_cost", { precision: 20, scale: 6 }),
    totalValue: numeric("total_value", { precision: 24, scale: 4 }),
    notes: text("notes"),
  },
  (table) => [
    unique("inventory_transaction_lines_company_id_id_uq").on(table.companyId, table.id),
    check(
      "inventory_transaction_lines_quantity_nonzero_ck",
      sql`${table.baseQuantity} <> 0 and ${table.enteredQuantity} > 0 and ${table.conversionFactorSnapshot} > 0`,
    ),
    index("inventory_transaction_lines_company_variant_time_idx").on(
      table.companyId,
      table.variantId,
      table.transactionId,
    ),
    index("inventory_transaction_lines_company_warehouse_idx").on(
      table.companyId,
      table.warehouseId,
    ),
    index("inventory_transaction_lines_company_batch_idx").on(table.companyId, table.batchId),
    index("inventory_transaction_lines_company_serial_idx").on(
      table.companyId,
      table.serialNumberId,
    ),
    foreignKey({
      columns: [table.companyId, table.transactionId],
      foreignColumns: [inventoryTransactions.companyId, inventoryTransactions.id],
      name: "inventory_transaction_lines_company_transaction_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "inventory_transaction_lines_company_variant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.packagingLevelId],
      foreignColumns: [productPackagingLevels.companyId, productPackagingLevels.id],
      name: "inventory_transaction_lines_company_packaging_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.warehouseId],
      foreignColumns: [warehouses.companyId, warehouses.id],
      name: "inventory_transaction_lines_company_warehouse_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.locationId],
      foreignColumns: [warehouseLocations.companyId, warehouseLocations.id],
      name: "inventory_transaction_lines_company_location_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.batchId],
      foreignColumns: [stockBatches.companyId, stockBatches.id],
      name: "inventory_transaction_lines_company_batch_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.serialNumberId],
      foreignColumns: [serialNumbers.companyId, serialNumbers.id],
      name: "inventory_transaction_lines_company_serial_fk",
    }).onDelete("restrict"),
  ],
);

export const inventoryBalanceProjections = pgTable(
  "inventory_balance_projections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    dimensionKey: text("dimension_key").notNull(),
    variantId: uuid("variant_id").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id"),
    batchId: uuid("batch_id"),
    quantityBase: numeric("quantity_base", { precision: 24, scale: 8 }).default("0").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("inventory_balance_projections_company_id_id_uq").on(table.companyId, table.id),
    unique("inventory_balance_projections_company_dimension_uq").on(
      table.companyId,
      table.dimensionKey,
    ),
    index("inventory_balance_projections_company_variant_idx").on(table.companyId, table.variantId),
    index("inventory_balance_projections_company_warehouse_idx").on(
      table.companyId,
      table.warehouseId,
    ),
    foreignKey({
      columns: [table.companyId, table.variantId],
      foreignColumns: [productVariants.companyId, productVariants.id],
      name: "inventory_balance_projections_company_variant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.warehouseId],
      foreignColumns: [warehouses.companyId, warehouses.id],
      name: "inventory_balance_projections_company_warehouse_fk",
    }).onDelete("restrict"),
  ],
);

export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull(),
    status: inventoryDocumentStatus("status").default("DRAFT").notNull(),
    reasonCode: text("reason_code").notNull(),
    notes: text("notes").notNull(),
    businessDate: date("business_date").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "restrict" }),
    postedTransactionId: uuid("posted_transaction_id"),
    ...documentAuditColumns,
  },
  (table) => [
    unique("stock_adjustments_company_id_id_uq").on(table.companyId, table.id),
    unique("stock_adjustments_company_number_uq").on(table.companyId, table.documentNumber),
    index("stock_adjustments_company_status_date_idx").on(
      table.companyId,
      table.status,
      table.businessDate,
    ),
  ],
);

export const stockAdjustmentLines = pgTable(
  "stock_adjustment_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    adjustmentId: uuid("adjustment_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    packagingLevelId: uuid("packaging_level_id"),
    packageQuantity: numeric("package_quantity", { precision: 24, scale: 8 }).notNull(),
    conversionFactorSnapshot: numeric("conversion_factor_snapshot", {
      precision: 24,
      scale: 8,
    }).notNull(),
    baseQuantity: numeric("base_quantity", { precision: 24, scale: 8 }).notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id"),
    batchId: uuid("batch_id"),
    serialNumbers: jsonb("serial_numbers").$type<string[]>().default([]).notNull(),
  },
  (table) => [
    index("stock_adjustment_lines_company_adjustment_idx").on(table.companyId, table.adjustmentId),
    foreignKey({
      columns: [table.companyId, table.adjustmentId],
      foreignColumns: [stockAdjustments.companyId, stockAdjustments.id],
      name: "stock_adjustment_lines_company_adjustment_fk",
    }).onDelete("restrict"),
  ],
);

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull(),
    status: inventoryDocumentStatus("status").default("PENDING").notNull(),
    sourceWarehouseId: uuid("source_warehouse_id").notNull(),
    destinationWarehouseId: uuid("destination_warehouse_id").notNull(),
    businessDate: date("business_date").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dispatchedBy: uuid("dispatched_by").references(() => users.id, { onDelete: "restrict" }),
    receivedBy: uuid("received_by").references(() => users.id, { onDelete: "restrict" }),
    ...documentAuditColumns,
  },
  (table) => [
    unique("stock_transfers_company_id_id_uq").on(table.companyId, table.id),
    unique("stock_transfers_company_number_uq").on(table.companyId, table.documentNumber),
    check(
      "stock_transfers_different_warehouse_ck",
      sql`${table.sourceWarehouseId} <> ${table.destinationWarehouseId}`,
    ),
    index("stock_transfers_company_status_date_idx").on(
      table.companyId,
      table.status,
      table.businessDate,
    ),
  ],
);

export const stockTransferLines = pgTable(
  "stock_transfer_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    transferId: uuid("transfer_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    packagingLevelId: uuid("packaging_level_id"),
    packageQuantity: numeric("package_quantity", { precision: 24, scale: 8 }).notNull(),
    conversionFactorSnapshot: numeric("conversion_factor_snapshot", {
      precision: 24,
      scale: 8,
    }).notNull(),
    baseQuantity: numeric("base_quantity", { precision: 24, scale: 8 }).notNull(),
    sourceLocationId: uuid("source_location_id"),
    destinationLocationId: uuid("destination_location_id"),
    batchId: uuid("batch_id"),
    serialNumbers: jsonb("serial_numbers").$type<string[]>().default([]).notNull(),
  },
  (table) => [
    index("stock_transfer_lines_company_transfer_idx").on(table.companyId, table.transferId),
    foreignKey({
      columns: [table.companyId, table.transferId],
      foreignColumns: [stockTransfers.companyId, stockTransfers.id],
      name: "stock_transfer_lines_company_transfer_fk",
    }).onDelete("restrict"),
  ],
);

export const stockCounts = pgTable(
  "stock_counts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull(),
    status: inventoryDocumentStatus("status").default("DRAFT").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "restrict" }),
    notes: text("notes"),
    ...documentAuditColumns,
  },
  (table) => [
    unique("stock_counts_company_id_id_uq").on(table.companyId, table.id),
    unique("stock_counts_company_number_uq").on(table.companyId, table.documentNumber),
    index("stock_counts_company_status_snapshot_idx").on(
      table.companyId,
      table.status,
      table.snapshotAt,
    ),
  ],
);

export const stockCountLines = pgTable(
  "stock_count_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    stockCountId: uuid("stock_count_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    packagingLevelId: uuid("packaging_level_id"),
    locationId: uuid("location_id"),
    batchId: uuid("batch_id"),
    systemQuantityBase: numeric("system_quantity_base", { precision: 24, scale: 8 }).notNull(),
    countedPackageQuantity: numeric("counted_package_quantity", { precision: 24, scale: 8 }),
    conversionFactorSnapshot: numeric("conversion_factor_snapshot", { precision: 24, scale: 8 }),
    countedQuantityBase: numeric("counted_quantity_base", { precision: 24, scale: 8 }),
    varianceQuantityBase: numeric("variance_quantity_base", { precision: 24, scale: 8 }),
    countedBy: uuid("counted_by").references(() => users.id, { onDelete: "restrict" }),
    countedAt: timestamp("counted_at", { withTimezone: true }),
    reason: text("reason"),
  },
  (table) => [
    index("stock_count_lines_company_count_idx").on(table.companyId, table.stockCountId),
    foreignKey({
      columns: [table.companyId, table.stockCountId],
      foreignColumns: [stockCounts.companyId, stockCounts.id],
      name: "stock_count_lines_company_count_fk",
    }).onDelete("restrict"),
  ],
);
