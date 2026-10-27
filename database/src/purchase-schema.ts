import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { companies, users } from "./schema.js";
import {
  inventoryTransactionLines,
  productPackagingLevels,
  productVariants,
  warehouses,
  warehouseLocations,
} from "./inventory-schema.js";
const base = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});
const doc = () => ({
  ...base(),
  referenceNumber: text("reference_number").notNull(),
  status: text("status").default("DRAFT").notNull(),
  businessDate: date("business_date").notNull(),
  notes: text("notes"),
  version: integer("version").default(1).notNull(),
});
const money = (name: string) => numeric(name, { precision: 20, scale: 4 });
const qty = (name: string) => numeric(name, { precision: 24, scale: 8 });
export const purchaseMatchStatus = pgEnum("purchase_match_status", [
  "PENDING",
  "MATCHED",
  "MISMATCH",
  "APPROVED_EXCEPTION",
  "DISPUTED",
]);
export const supplierCategories = pgTable(
  "supplier_categories",
  {
    ...base(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("supplier_categories_company_id_id_uq").on(t.companyId, t.id),
    unique("supplier_categories_company_code_uq").on(t.companyId, t.code),
  ],
);
export const suppliers = pgTable(
  "suppliers",
  {
    ...base(),
    categoryId: uuid("category_id").references(() => supplierCategories.id, {
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    legalName: text("legal_name").notNull(),
    displayName: text("display_name").notNull(),
    contactPerson: text("contact_person"),
    mobileNumber: text("mobile_number"),
    email: text("email"),
    taxRegistrationNumber: text("tax_registration_number"),
    taxIdentityNumber: text("tax_identity_number"),
    paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
    creditLimit: money("credit_limit").default("0").notNull(),
    defaultCurrency: text("default_currency").notNull(),
    active: boolean("active").default(false).notNull(),
    notes: text("notes"),
    attachmentReferences: jsonb("attachment_references").$type<string[]>().default([]).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("suppliers_company_id_id_uq").on(t.companyId, t.id),
    unique("suppliers_company_code_uq").on(t.companyId, t.code),
    index("suppliers_company_name_idx").on(t.companyId, t.displayName),
  ],
);
export const supplierContacts = pgTable(
  "supplier_contacts",
  {
    ...base(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    phone: text("phone"),
    email: text("email"),
    primary: boolean("is_primary").default(false).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("supplier_contacts_company_id_id_uq").on(t.companyId, t.id),
    index("supplier_contacts_company_supplier_idx").on(t.companyId, t.supplierId),
  ],
);
export const supplierAddresses = pgTable(
  "supplier_addresses",
  {
    ...base(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    addressType: text("address_type").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region"),
    postalCode: text("postal_code"),
    countryCode: text("country_code").notNull(),
    primary: boolean("is_primary").default(false).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("supplier_addresses_company_id_id_uq").on(t.companyId, t.id),
    index("supplier_addresses_company_supplier_idx").on(t.companyId, t.supplierId),
  ],
);
export const supplierBankAccounts = pgTable(
  "supplier_bank_accounts",
  {
    ...base(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    maskedAccount: text("masked_account").notNull(),
    bankName: text("bank_name").notNull(),
    encryptedPayload: text("encrypted_payload").notNull(),
    keyReference: text("key_reference").notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (t) => [
    unique("supplier_bank_accounts_company_id_id_uq").on(t.companyId, t.id),
    index("supplier_bank_accounts_company_supplier_idx").on(t.companyId, t.supplierId),
  ],
);
export const purchaseRequisitions = pgTable(
  "purchase_requisitions",
  {
    ...doc(),
    requiredDate: date("required_date"),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id, { onDelete: "restrict" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    decisionReason: text("decision_reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("purchase_requisitions_company_id_id_uq").on(t.companyId, t.id),
    unique("purchase_requisitions_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("purchase_requisitions_company_status_idx").on(t.companyId, t.status, t.businessDate),
  ],
);
export const purchaseRequisitionLines = pgTable(
  "purchase_requisition_lines",
  {
    ...base(),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => purchaseRequisitions.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    packagingLevelId: uuid("packaging_level_id").references(() => productPackagingLevels.id, {
      onDelete: "restrict",
    }),
    packageQuantity: qty("package_quantity").notNull(),
    conversionSnapshot: qty("conversion_snapshot").notNull(),
    baseQuantity: qty("base_quantity").notNull(),
    remarks: text("remarks"),
  },
  (t) => [
    unique("purchase_requisition_lines_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_requisition_lines_company_doc_idx").on(t.companyId, t.requisitionId),
  ],
);
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    ...doc(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    requisitionId: uuid("requisition_id").references(() => purchaseRequisitions.id, {
      onDelete: "restrict",
    }),
    currency: text("currency").notNull(),
    expectedDeliveryDate: date("expected_delivery_date"),
    subtotal: money("subtotal").notNull(),
    discountTotal: money("discount_total").default("0").notNull(),
    taxTotal: money("tax_total").default("0").notNull(),
    grandTotal: money("grand_total").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("purchase_orders_company_id_id_uq").on(t.companyId, t.id),
    unique("purchase_orders_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("purchase_orders_company_supplier_status_idx").on(t.companyId, t.supplierId, t.status),
  ],
);
export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    ...base(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    packagingLevelId: uuid("packaging_level_id").references(() => productPackagingLevels.id, {
      onDelete: "restrict",
    }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    packageQuantity: qty("package_quantity").notNull(),
    conversionSnapshot: qty("conversion_snapshot").notNull(),
    baseQuantity: qty("base_quantity").notNull(),
    receivedBaseQuantity: qty("received_base_quantity").default("0").notNull(),
    returnedBaseQuantity: qty("returned_base_quantity").default("0").notNull(),
    invoicedBaseQuantity: qty("invoiced_base_quantity").default("0").notNull(),
    packageUnitPrice: money("package_unit_price").notNull(),
    discountAmount: money("discount_amount").default("0").notNull(),
    taxAmount: money("tax_amount").default("0").notNull(),
    lineTotal: money("line_total").notNull(),
  },
  (t) => [
    unique("purchase_order_lines_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_order_lines_company_doc_idx").on(t.companyId, t.purchaseOrderId),
  ],
);
export const purchaseOrderApprovals = pgTable(
  "purchase_order_approvals",
  {
    ...base(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reason: text("reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("purchase_order_approvals_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_order_approvals_company_doc_idx").on(t.companyId, t.purchaseOrderId),
  ],
);
export const goodsReceipts = pgTable(
  "goods_receipts",
  {
    ...doc(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    inventoryTransactionId: uuid("inventory_transaction_id"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("goods_receipts_company_id_id_uq").on(t.companyId, t.id),
    unique("goods_receipts_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("goods_receipts_company_order_idx").on(t.companyId, t.purchaseOrderId),
  ],
);
export const goodsReceiptLines = pgTable(
  "goods_receipt_lines",
  {
    ...base(),
    goodsReceiptId: uuid("goods_receipt_id")
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: "restrict" }),
    purchaseOrderLineId: uuid("purchase_order_line_id")
      .notNull()
      .references(() => purchaseOrderLines.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    packagingLevelId: uuid("packaging_level_id").references(() => productPackagingLevels.id, {
      onDelete: "restrict",
    }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    locationId: uuid("location_id").references(() => warehouseLocations.id, {
      onDelete: "restrict",
    }),
    packageQuantity: qty("package_quantity").notNull(),
    conversionSnapshot: qty("conversion_snapshot").notNull(),
    acceptedBaseQuantity: qty("accepted_base_quantity").notNull(),
    rejectedBaseQuantity: qty("rejected_base_quantity").default("0").notNull(),
    inventoryTransactionLineId: uuid("inventory_transaction_line_id").references(
      () => inventoryTransactionLines.id,
      { onDelete: "restrict" },
    ),
  },
  (t) => [
    unique("goods_receipt_lines_company_id_id_uq").on(t.companyId, t.id),
    index("goods_receipt_lines_company_doc_idx").on(t.companyId, t.goodsReceiptId),
  ],
);
export const goodsReceiptBatches = pgTable(
  "goods_receipt_batches",
  {
    ...base(),
    goodsReceiptLineId: uuid("goods_receipt_line_id")
      .notNull()
      .references(() => goodsReceiptLines.id, { onDelete: "restrict" }),
    batchNumber: text("batch_number").notNull(),
    expiryDate: date("expiry_date"),
    baseQuantity: qty("base_quantity").notNull(),
  },
  (t) => [
    unique("goods_receipt_batches_company_id_id_uq").on(t.companyId, t.id),
    index("goods_receipt_batches_company_line_idx").on(t.companyId, t.goodsReceiptLineId),
  ],
);
export const goodsReceiptSerialNumbers = pgTable(
  "goods_receipt_serial_numbers",
  {
    ...base(),
    goodsReceiptLineId: uuid("goods_receipt_line_id")
      .notNull()
      .references(() => goodsReceiptLines.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    serialNumber: text("serial_number").notNull(),
  },
  (t) => [
    unique("goods_receipt_serial_numbers_company_id_id_uq").on(t.companyId, t.id),
    unique("goods_receipt_serial_numbers_company_variant_serial_uq").on(
      t.companyId,
      t.variantId,
      t.serialNumber,
    ),
  ],
);
export const purchaseInvoices = pgTable(
  "purchase_invoices",
  {
    ...doc(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, {
      onDelete: "restrict",
    }),
    supplierInvoiceNumber: text("supplier_invoice_number").notNull(),
    currency: text("currency").notNull(),
    invoiceTotal: money("invoice_total").notNull(),
    outstandingAmount: money("outstanding_amount").notNull(),
    matchStatus: purchaseMatchStatus("match_status").default("PENDING").notNull(),
    attachmentReferences: jsonb("attachment_references").$type<string[]>().default([]).notNull(),
  },
  (t) => [
    unique("purchase_invoices_company_id_id_uq").on(t.companyId, t.id),
    unique("purchase_invoices_company_supplier_number_uq").on(
      t.companyId,
      t.supplierId,
      t.supplierInvoiceNumber,
    ),
    index("purchase_invoices_company_supplier_status_idx").on(t.companyId, t.supplierId, t.status),
  ],
);
export const purchaseInvoiceLines = pgTable(
  "purchase_invoice_lines",
  {
    ...base(),
    purchaseInvoiceId: uuid("purchase_invoice_id")
      .notNull()
      .references(() => purchaseInvoices.id, { onDelete: "restrict" }),
    purchaseOrderLineId: uuid("purchase_order_line_id").references(() => purchaseOrderLines.id, {
      onDelete: "restrict",
    }),
    goodsReceiptLineId: uuid("goods_receipt_line_id").references(() => goodsReceiptLines.id, {
      onDelete: "restrict",
    }),
    variantId: uuid("variant_id").notNull(),
    invoicedBaseQuantity: qty("invoiced_base_quantity").notNull(),
    packageUnitPrice: money("package_unit_price").notNull(),
    taxAmount: money("tax_amount").default("0").notNull(),
    lineTotal: money("line_total").notNull(),
  },
  (t) => [
    unique("purchase_invoice_lines_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_invoice_lines_company_doc_idx").on(t.companyId, t.purchaseInvoiceId),
  ],
);
export const purchaseInvoiceMatches = pgTable(
  "purchase_invoice_matches",
  {
    ...base(),
    purchaseInvoiceLineId: uuid("purchase_invoice_line_id")
      .notNull()
      .references(() => purchaseInvoiceLines.id, { onDelete: "restrict" }),
    purchaseOrderLineId: uuid("purchase_order_line_id").references(() => purchaseOrderLines.id, {
      onDelete: "restrict",
    }),
    goodsReceiptLineId: uuid("goods_receipt_line_id").references(() => goodsReceiptLines.id, {
      onDelete: "restrict",
    }),
    status: purchaseMatchStatus("status").notNull(),
    orderedBaseQuantity: qty("ordered_base_quantity"),
    receivedBaseQuantity: qty("received_base_quantity"),
    invoicedBaseQuantity: qty("invoiced_base_quantity"),
    orderedPackagePrice: money("ordered_package_price"),
    invoicedPackagePrice: money("invoiced_package_price"),
    issues: jsonb("issues").$type<string[]>().default([]).notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [
    unique("purchase_invoice_matches_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_invoice_matches_company_invoice_idx").on(
      t.companyId,
      t.purchaseInvoiceLineId,
      t.status,
    ),
  ],
);
export const purchaseReturns = pgTable(
  "purchase_returns",
  {
    ...doc(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    goodsReceiptId: uuid("goods_receipt_id")
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    creditNoteReference: text("credit_note_reference"),
    inventoryTransactionId: uuid("inventory_transaction_id"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("purchase_returns_company_id_id_uq").on(t.companyId, t.id),
    unique("purchase_returns_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("purchase_returns_company_receipt_idx").on(t.companyId, t.goodsReceiptId),
  ],
);
export const purchaseReturnLines = pgTable(
  "purchase_return_lines",
  {
    ...base(),
    purchaseReturnId: uuid("purchase_return_id")
      .notNull()
      .references(() => purchaseReturns.id, { onDelete: "restrict" }),
    goodsReceiptLineId: uuid("goods_receipt_line_id")
      .notNull()
      .references(() => goodsReceiptLines.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id"),
    packageQuantity: qty("package_quantity").notNull(),
    conversionSnapshot: qty("conversion_snapshot").notNull(),
    baseQuantity: qty("base_quantity").notNull(),
    inventoryTransactionLineId: uuid("inventory_transaction_line_id"),
  },
  (t) => [
    unique("purchase_return_lines_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_return_lines_company_doc_idx").on(t.companyId, t.purchaseReturnId),
  ],
);
export const purchaseReturnBatches = pgTable(
  "purchase_return_batches",
  {
    ...base(),
    purchaseReturnLineId: uuid("purchase_return_line_id")
      .notNull()
      .references(() => purchaseReturnLines.id, { onDelete: "restrict" }),
    batchNumber: text("batch_number").notNull(),
    expiryDate: date("expiry_date"),
    baseQuantity: qty("base_quantity").notNull(),
  },
  (t) => [
    unique("purchase_return_batches_company_id_id_uq").on(t.companyId, t.id),
    index("purchase_return_batches_company_line_idx").on(t.companyId, t.purchaseReturnLineId),
  ],
);
export const purchaseReturnSerialNumbers = pgTable(
  "purchase_return_serial_numbers",
  {
    ...base(),
    purchaseReturnLineId: uuid("purchase_return_line_id")
      .notNull()
      .references(() => purchaseReturnLines.id, { onDelete: "restrict" }),
    serialNumber: text("serial_number").notNull(),
  },
  (t) => [
    unique("purchase_return_serial_numbers_company_id_id_uq").on(t.companyId, t.id),
    unique("purchase_return_serial_numbers_company_line_serial_uq").on(
      t.companyId,
      t.purchaseReturnLineId,
      t.serialNumber,
    ),
  ],
);
export const landedCosts = pgTable(
  "landed_costs",
  {
    ...doc(),
    goodsReceiptId: uuid("goods_receipt_id")
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: "restrict" }),
    allocationMethod: text("allocation_method").notNull(),
    currency: text("currency").notNull(),
    totalAmount: money("total_amount").notNull(),
  },
  (t) => [
    unique("landed_costs_company_id_id_uq").on(t.companyId, t.id),
    unique("landed_costs_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("landed_costs_company_receipt_idx").on(t.companyId, t.goodsReceiptId),
  ],
);
export const landedCostLines = pgTable(
  "landed_cost_lines",
  {
    ...base(),
    landedCostId: uuid("landed_cost_id")
      .notNull()
      .references(() => landedCosts.id, { onDelete: "restrict" }),
    costType: text("cost_type").notNull(),
    description: text("description"),
    amount: money("amount").notNull(),
  },
  (t) => [
    unique("landed_cost_lines_company_id_id_uq").on(t.companyId, t.id),
    index("landed_cost_lines_company_doc_idx").on(t.companyId, t.landedCostId),
  ],
);
export const landedCostAllocations = pgTable(
  "landed_cost_allocations",
  {
    ...base(),
    landedCostId: uuid("landed_cost_id")
      .notNull()
      .references(() => landedCosts.id, { onDelete: "restrict" }),
    landedCostLineId: uuid("landed_cost_line_id")
      .notNull()
      .references(() => landedCostLines.id, { onDelete: "restrict" }),
    goodsReceiptLineId: uuid("goods_receipt_line_id")
      .notNull()
      .references(() => goodsReceiptLines.id, { onDelete: "restrict" }),
    basisQuantity: qty("basis_quantity"),
    basisValue: money("basis_value"),
    allocatedAmount: money("allocated_amount").notNull(),
    effectiveCostPerBaseUnit: money("effective_cost_per_base_unit"),
  },
  (t) => [
    unique("landed_cost_allocations_company_id_id_uq").on(t.companyId, t.id),
    index("landed_cost_allocations_company_doc_idx").on(t.companyId, t.landedCostId),
  ],
);
export const supplierPayments = pgTable(
  "supplier_payments",
  {
    ...doc(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    paymentMethod: text("payment_method").notNull(),
    currency: text("currency").notNull(),
    amount: money("amount").notNull(),
    paymentReference: text("payment_reference").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (t) => [
    unique("supplier_payments_company_id_id_uq").on(t.companyId, t.id),
    unique("supplier_payments_company_reference_uq").on(t.companyId, t.referenceNumber),
    index("supplier_payments_company_supplier_idx").on(t.companyId, t.supplierId, t.businessDate),
  ],
);
export const supplierPaymentAllocations = pgTable(
  "supplier_payment_allocations",
  {
    ...base(),
    supplierPaymentId: uuid("supplier_payment_id")
      .notNull()
      .references(() => supplierPayments.id, { onDelete: "restrict" }),
    purchaseInvoiceId: uuid("purchase_invoice_id")
      .notNull()
      .references(() => purchaseInvoices.id, { onDelete: "restrict" }),
    allocatedAmount: money("allocated_amount").notNull(),
  },
  (t) => [
    unique("supplier_payment_allocations_company_id_id_uq").on(t.companyId, t.id),
    index("supplier_payment_allocations_company_payment_idx").on(t.companyId, t.supplierPaymentId),
    index("supplier_payment_allocations_company_invoice_idx").on(t.companyId, t.purchaseInvoiceId),
  ],
);
