import { z } from "zod";
import { positiveDecimalStringSchema } from "./inventory.js";
const code = z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  name = z.string().trim().min(1).max(200),
  money = z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,4})?$/);
export const supplierInputSchema = z.object({
  code,
  legalName: name,
  displayName: name,
  contactPerson: z.string().trim().max(160).optional(),
  mobileNumber: z.string().trim().max(32).optional(),
  email: z.email().optional(),
  taxRegistrationNumber: z.string().trim().max(80).optional(),
  taxIdentityNumber: z.string().trim().max(80).optional(),
  paymentTermsDays: z.number().int().min(0).max(3650).default(0),
  creditLimit: money.default("0"),
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  categoryId: z.uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
});
export const supplierContactInputSchema = z.object({
  name,
  role: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.email().optional(),
  primary: z.boolean().default(false),
});
export const supplierAddressInputSchema = z.object({
  addressType: z.enum(["BILLING", "PICKUP", "SHIPPING", "OTHER"]),
  line1: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(32).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  primary: z.boolean().default(false),
});
export const purchaseRequisitionInputSchema = z.object({
  referenceNumber: z.string().trim().min(1).max(80),
  businessDate: z.iso.date(),
  requiredDate: z.iso.date().optional(),
  warehouseId: z.uuid(),
  notes: z.string().trim().max(2000).optional(),
  lines: z
    .array(
      z.object({
        variantId: z.uuid(),
        packagingLevelId: z.uuid().optional(),
        packageQuantity: positiveDecimalStringSchema,
        conversionSnapshot: positiveDecimalStringSchema,
        requiredDate: z.iso.date().optional(),
        remarks: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1)
    .max(500),
});
export const purchaseLineInputSchema = z.object({
  variantId: z.uuid(),
  packagingLevelId: z.uuid().optional(),
  packageQuantity: positiveDecimalStringSchema,
  conversionSnapshot: positiveDecimalStringSchema,
  packageUnitPrice: positiveDecimalStringSchema,
  discountAmount: money.default("0"),
  taxAmount: money.default("0"),
  warehouseId: z.uuid(),
  requiredDate: z.iso.date().optional(),
});
export const purchaseOrderInputSchema = z.object({
  supplierId: z.uuid(),
  referenceNumber: z.string().trim().min(1).max(80),
  orderDate: z.iso.date(),
  expectedDeliveryDate: z.iso.date().optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  requisitionId: z.uuid().optional(),
  lines: z.array(purchaseLineInputSchema).min(1).max(500),
});
export const goodsReceiptLineInputSchema = z.object({
  purchaseOrderLineId: z.uuid(),
  packageQuantity: positiveDecimalStringSchema,
  warehouseId: z.uuid(),
  locationId: z.uuid().optional(),
  batchNumber: z.string().trim().max(100).optional(),
  expiryDate: z.iso.date().optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(160)).max(1000).default([]),
  rejectedPackageQuantity: money.default("0"),
});
export const goodsReceiptInputSchema = z.object({
  purchaseOrderId: z.uuid(),
  referenceNumber: z.string().trim().min(1).max(80),
  receiptDate: z.iso.date(),
  lines: z.array(goodsReceiptLineInputSchema).min(1).max(500),
});
export const purchaseInvoiceInputSchema = z.object({
  supplierId: z.uuid(),
  purchaseOrderId: z.uuid().optional(),
  supplierInvoiceNumber: z.string().trim().min(1).max(120),
  invoiceDate: z.iso.date(),
  currency: z.string().trim().length(3),
  lines: z
    .array(
      z.object({
        purchaseOrderLineId: z.uuid().optional(),
        goodsReceiptLineId: z.uuid().optional(),
        variantId: z.uuid(),
        invoicedBaseQuantity: positiveDecimalStringSchema,
        packageUnitPrice: positiveDecimalStringSchema,
        taxAmount: money.default("0"),
      }),
    )
    .min(1)
    .max(500),
});
export const purchaseReturnInputSchema = z.object({
  supplierId: z.uuid(),
  goodsReceiptId: z.uuid(),
  referenceNumber: z.string().trim().min(1).max(80),
  returnDate: z.iso.date(),
  reason: z.enum([
    "DAMAGE",
    "INCORRECT_PRODUCT",
    "EXPIRED",
    "QUALITY_FAILURE",
    "EXCESS_SUPPLY",
    "OTHER",
  ]),
  creditNoteReference: z.string().trim().max(120).optional(),
  lines: z
    .array(
      z.object({
        goodsReceiptLineId: z.uuid(),
        packageQuantity: positiveDecimalStringSchema,
        warehouseId: z.uuid(),
        locationId: z.uuid().optional(),
        batchNumber: z.string().trim().max(100).optional(),
        expiryDate: z.iso.date().optional(),
        serialNumbers: z.array(z.string().trim().min(1).max(160)).max(1000).default([]),
      }),
    )
    .min(1)
    .max(500),
});
export const landedCostInputSchema = z.object({
  goodsReceiptId: z.uuid(),
  referenceNumber: z.string().trim().min(1).max(80),
  allocationMethod: z.enum(["QUANTITY", "WEIGHT", "VOLUME", "ITEM_VALUE", "MANUAL"]),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  lines: z
    .array(
      z.object({
        costType: z.enum([
          "FREIGHT",
          "LOADING",
          "UNLOADING",
          "TRANSPORT",
          "INSURANCE",
          "CUSTOMS",
          "CLEARING",
          "HANDLING",
          "OTHER",
        ]),
        amount: positiveDecimalStringSchema,
      }),
    )
    .min(1)
    .max(100),
});
export const supplierPaymentInputSchema = z.object({
  supplierId: z.uuid(),
  referenceNumber: z.string().trim().min(1).max(120),
  paymentDate: z.iso.date(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"]),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  amount: positiveDecimalStringSchema,
  allocations: z
    .array(z.object({ invoiceId: z.uuid(), amount: positiveDecimalStringSchema }))
    .min(1)
    .max(500),
});
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type SupplierContactInput = z.infer<typeof supplierContactInputSchema>;
export type SupplierAddressInput = z.infer<typeof supplierAddressInputSchema>;
export type PurchaseRequisitionInput = z.infer<typeof purchaseRequisitionInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type GoodsReceiptInput = z.infer<typeof goodsReceiptInputSchema>;
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceInputSchema>;
export type PurchaseReturnInput = z.infer<typeof purchaseReturnInputSchema>;
export type LandedCostInput = z.infer<typeof landedCostInputSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentInputSchema>;
