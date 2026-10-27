import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { companies, users } from "./schema.js";
import {
  productPackagingLevels,
  productVariants,
  warehouseLocations,
  warehouses,
} from "./inventory-schema.js";
const qty = (n: string) => numeric(n, { precision: 24, scale: 8 }),
  money = (n: string) => numeric(n, { precision: 20, scale: 4 });
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
export const customerCategories = pgTable(
  "customer_categories",
  {
    ...base(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("customer_categories_company_id_id_uq").on(t.companyId, t.id),
    unique("customer_categories_company_code_uq").on(t.companyId, t.code),
  ],
);
export const customers = pgTable(
  "customers",
  {
    ...base(),
    categoryId: uuid("category_id"),
    defaultPriceListId: uuid("default_price_list_id"),
    salespersonId: uuid("salesperson_id").references(() => users.id, { onDelete: "set null" }),
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
    unique("customers_company_id_id_uq").on(t.companyId, t.id),
    unique("customers_company_code_uq").on(t.companyId, t.code),
    index("customers_company_name_idx").on(t.companyId, t.displayName),
  ],
);
export const customerContacts = pgTable("customer_contacts", {
  ...base(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  phone: text("phone"),
  email: text("email"),
  primary: boolean("is_primary").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export const customerAddresses = pgTable("customer_addresses", {
  ...base(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  addressType: text("address_type").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region"),
  postalCode: text("postal_code"),
  countryCode: text("country_code").notNull(),
  primary: boolean("is_primary").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export const priceLists = pgTable("price_lists", {
  ...base(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  taxInclusive: boolean("tax_inclusive").default(false).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export const priceListItems = pgTable("price_list_items", {
  ...base(),
  priceListId: uuid("price_list_id")
    .notNull()
    .references(() => priceLists.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "restrict" }),
  packagingLevelId: uuid("packaging_level_id").references(() => productPackagingLevels.id, {
    onDelete: "restrict",
  }),
  unitPrice: money("unit_price").notNull(),
  minimumSellingPrice: money("minimum_selling_price").default("0").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
});
export const customerPriceAssignments = pgTable("customer_price_assignments", {
  ...base(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "restrict" }),
  customerCategoryId: uuid("customer_category_id").references(() => customerCategories.id, {
    onDelete: "restrict",
  }),
  priceListId: uuid("price_list_id")
    .notNull()
    .references(() => priceLists.id, { onDelete: "restrict" }),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
});
export const salesQuotations = pgTable("sales_quotations", {
  ...doc(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  validUntil: date("valid_until").notNull(),
  currency: text("currency").notNull(),
  subtotal: money("subtotal").notNull(),
  discountTotal: money("discount_total").default("0").notNull(),
  taxTotal: money("tax_total").default("0").notNull(),
  grandTotal: money("grand_total").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  convertedOrderId: uuid("converted_order_id"),
});
export const salesQuotationLines = pgTable("sales_quotation_lines", {
  ...base(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => salesQuotations.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull(),
  packagingLevelId: uuid("packaging_level_id"),
  warehouseId: uuid("warehouse_id").notNull(),
  packageQuantity: qty("package_quantity").notNull(),
  conversionSnapshot: qty("conversion_snapshot").notNull(),
  baseQuantity: qty("base_quantity").notNull(),
  packageUnitPrice: money("package_unit_price").notNull(),
  discountAmount: money("discount_amount").default("0").notNull(),
  taxAmount: money("tax_amount").default("0").notNull(),
  lineTotal: money("line_total").notNull(),
});
export const salesOrders = pgTable("sales_orders", {
  ...doc(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  quotationId: uuid("quotation_id").references(() => salesQuotations.id, { onDelete: "restrict" }),
  currency: text("currency").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  subtotal: money("subtotal").notNull(),
  discountTotal: money("discount_total").default("0").notNull(),
  taxTotal: money("tax_total").default("0").notNull(),
  grandTotal: money("grand_total").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  creditOverrideReason: text("credit_override_reason"),
});
export const salesOrderLines = pgTable("sales_order_lines", {
  ...base(),
  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull(),
  packagingLevelId: uuid("packaging_level_id"),
  warehouseId: uuid("warehouse_id").notNull(),
  packageQuantity: qty("package_quantity").notNull(),
  conversionSnapshot: qty("conversion_snapshot").notNull(),
  baseQuantity: qty("base_quantity").notNull(),
  reservedBaseQuantity: qty("reserved_base_quantity").default("0").notNull(),
  dispatchedBaseQuantity: qty("dispatched_base_quantity").default("0").notNull(),
  returnedBaseQuantity: qty("returned_base_quantity").default("0").notNull(),
  invoicedBaseQuantity: qty("invoiced_base_quantity").default("0").notNull(),
  packageUnitPrice: money("package_unit_price").notNull(),
  discountAmount: money("discount_amount").default("0").notNull(),
  taxAmount: money("tax_amount").default("0").notNull(),
  lineTotal: money("line_total").notNull(),
});
export const salesOrderApprovals = pgTable("sales_order_approvals", {
  ...base(),
  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "restrict" }),
  decision: text("decision").notNull(),
  reason: text("reason"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
});
export const stockReservations = pgTable("stock_reservations", {
  ...doc(),
  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "restrict" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});
export const stockReservationLines = pgTable("stock_reservation_lines", {
  ...base(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => stockReservations.id, { onDelete: "restrict" }),
  salesOrderLineId: uuid("sales_order_line_id")
    .notNull()
    .references(() => salesOrderLines.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").notNull(),
  warehouseId: uuid("warehouse_id").notNull(),
  reservedBaseQuantity: qty("reserved_base_quantity").notNull(),
  fulfilledBaseQuantity: qty("fulfilled_base_quantity").default("0").notNull(),
  releasedBaseQuantity: qty("released_base_quantity").default("0").notNull(),
});
export const deliveryChallans = pgTable("delivery_challans", {
  ...doc(),
  salesOrderId: uuid("sales_order_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  inventoryTransactionId: uuid("inventory_transaction_id"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
});
export const deliveryChallanLines = pgTable("delivery_challan_lines", {
  ...base(),
  deliveryChallanId: uuid("delivery_challan_id")
    .notNull()
    .references(() => deliveryChallans.id, { onDelete: "restrict" }),
  salesOrderLineId: uuid("sales_order_line_id").notNull(),
  variantId: uuid("variant_id").notNull(),
  packagingLevelId: uuid("packaging_level_id"),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "restrict" }),
  locationId: uuid("location_id").references(() => warehouseLocations.id, { onDelete: "restrict" }),
  packageQuantity: qty("package_quantity").notNull(),
  conversionSnapshot: qty("conversion_snapshot").notNull(),
  baseQuantity: qty("base_quantity").notNull(),
  inventoryTransactionLineId: uuid("inventory_transaction_line_id"),
});
export const deliveryChallanBatches = pgTable("delivery_challan_batches", {
  ...base(),
  deliveryChallanLineId: uuid("delivery_challan_line_id")
    .notNull()
    .references(() => deliveryChallanLines.id, { onDelete: "restrict" }),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date"),
  baseQuantity: qty("base_quantity").notNull(),
});
export const deliveryChallanSerialNumbers = pgTable("delivery_challan_serial_numbers", {
  ...base(),
  deliveryChallanLineId: uuid("delivery_challan_line_id")
    .notNull()
    .references(() => deliveryChallanLines.id, { onDelete: "restrict" }),
  serialNumber: text("serial_number").notNull(),
});
export const salesInvoices = pgTable("sales_invoices", {
  ...doc(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  salesOrderId: uuid("sales_order_id"),
  deliveryChallanId: uuid("delivery_challan_id"),
  currency: text("currency").notNull(),
  invoiceTotal: money("invoice_total").notNull(),
  outstandingAmount: money("outstanding_amount").notNull(),
  immediateDelivery: boolean("immediate_delivery").default(false).notNull(),
  linkedDispatchId: uuid("linked_dispatch_id"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
});
export const salesInvoiceLines = pgTable("sales_invoice_lines", {
  ...base(),
  salesInvoiceId: uuid("sales_invoice_id")
    .notNull()
    .references(() => salesInvoices.id, { onDelete: "restrict" }),
  deliveryChallanLineId: uuid("delivery_challan_line_id"),
  salesOrderLineId: uuid("sales_order_line_id"),
  variantId: uuid("variant_id").notNull(),
  packagingLevelId: uuid("packaging_level_id"),
  packageQuantity: qty("package_quantity").notNull(),
  conversionSnapshot: qty("conversion_snapshot").notNull(),
  baseQuantity: qty("base_quantity").notNull(),
  packageUnitPrice: money("package_unit_price").notNull(),
  discountAmount: money("discount_amount").default("0").notNull(),
  taxAmount: money("tax_amount").default("0").notNull(),
  lineTotal: money("line_total").notNull(),
});
export const salesReturns = pgTable("sales_returns", {
  ...doc(),
  customerId: uuid("customer_id").notNull(),
  salesInvoiceId: uuid("sales_invoice_id"),
  deliveryChallanId: uuid("delivery_challan_id").notNull(),
  reason: text("reason").notNull(),
  condition: text("condition").notNull(),
  inventoryTransactionId: uuid("inventory_transaction_id"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by"),
});
export const salesReturnLines = pgTable("sales_return_lines", {
  ...base(),
  salesReturnId: uuid("sales_return_id")
    .notNull()
    .references(() => salesReturns.id, { onDelete: "restrict" }),
  deliveryChallanLineId: uuid("delivery_challan_line_id").notNull(),
  variantId: uuid("variant_id").notNull(),
  warehouseId: uuid("warehouse_id").notNull(),
  locationId: uuid("location_id"),
  packageQuantity: qty("package_quantity").notNull(),
  conversionSnapshot: qty("conversion_snapshot").notNull(),
  baseQuantity: qty("base_quantity").notNull(),
  inventoryTransactionLineId: uuid("inventory_transaction_line_id"),
});
export const salesReturnBatches = pgTable("sales_return_batches", {
  ...base(),
  salesReturnLineId: uuid("sales_return_line_id")
    .notNull()
    .references(() => salesReturnLines.id, { onDelete: "restrict" }),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date"),
  baseQuantity: qty("base_quantity").notNull(),
});
export const salesReturnSerialNumbers = pgTable("sales_return_serial_numbers", {
  ...base(),
  salesReturnLineId: uuid("sales_return_line_id")
    .notNull()
    .references(() => salesReturnLines.id, { onDelete: "restrict" }),
  serialNumber: text("serial_number").notNull(),
});
export const creditNotes = pgTable("credit_notes", {
  ...doc(),
  customerId: uuid("customer_id").notNull(),
  salesInvoiceId: uuid("sales_invoice_id"),
  salesReturnId: uuid("sales_return_id"),
  currency: text("currency").notNull(),
  totalAmount: money("total_amount").notNull(),
  reason: text("reason").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
});
export const creditNoteLines = pgTable("credit_note_lines", {
  ...base(),
  creditNoteId: uuid("credit_note_id")
    .notNull()
    .references(() => creditNotes.id, { onDelete: "restrict" }),
  salesInvoiceLineId: uuid("sales_invoice_line_id"),
  salesReturnLineId: uuid("sales_return_line_id"),
  amount: money("amount").notNull(),
});
export const customerPayments = pgTable("customer_payments", {
  ...doc(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  paymentMethod: text("payment_method").notNull(),
  currency: text("currency").notNull(),
  amount: money("amount").notNull(),
  paymentReference: text("payment_reference").notNull(),
});
export const customerPaymentAllocations = pgTable("customer_payment_allocations", {
  ...base(),
  customerPaymentId: uuid("customer_payment_id")
    .notNull()
    .references(() => customerPayments.id, { onDelete: "restrict" }),
  salesInvoiceId: uuid("sales_invoice_id")
    .notNull()
    .references(() => salesInvoices.id, { onDelete: "restrict" }),
  allocatedAmount: money("allocated_amount").notNull(),
});
