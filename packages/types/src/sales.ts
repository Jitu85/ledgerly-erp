import { z } from "zod";
import { positiveDecimalStringSchema } from "./inventory.js";
const code = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const name = z.string().trim().min(1).max(200);
const money = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,4})?$/);
const currency = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase());
const reference = z.string().trim().min(1).max(120);
export const customerInputSchema = z.object({
  code,
  legalName: name,
  displayName: name,
  contactPerson: z.string().trim().max(160).optional(),
  mobileNumber: z.string().trim().max(32).optional(),
  email: z.email().optional(),
  taxRegistrationNumber: z.string().trim().max(80).optional(),
  taxIdentityNumber: z.string().trim().max(80).optional(),
  categoryId: z.uuid().optional(),
  paymentTermsDays: z.number().int().min(0).max(3650).default(0),
  creditLimit: money.default("0"),
  defaultPriceListId: z.uuid().optional(),
  defaultCurrency: currency,
  salespersonId: z.uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
});
export const customerContactInputSchema = z.object({
  name,
  role: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.email().optional(),
  primary: z.boolean().default(false),
});
export const customerAddressInputSchema = z.object({
  addressType: z.enum(["BILLING", "SHIPPING", "OTHER"]),
  line1: z.string().trim().min(1).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(32).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  primary: z.boolean().default(false),
});
export const customerCategoryInputSchema = z.object({
  code,
  name,
});
export const customerPriceAssignmentInputSchema = z
  .object({
    customerId: z.uuid().optional(),
    customerCategoryId: z.uuid().optional(),
    priceListId: z.uuid(),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().optional(),
  })
  .refine((value) => Boolean(value.customerId) !== Boolean(value.customerCategoryId), {
    message: "Assign a price list to either one customer or one customer category",
  });
export const priceListInputSchema = z.object({
  code,
  name,
  currency,
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date().optional(),
  taxInclusive: z.boolean().default(false),
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        packagingLevelId: z.uuid().optional(),
        unitPrice: money,
        minSellingPrice: money.default("0"),
        effectiveFrom: z.iso.date(),
        effectiveTo: z.iso.date().optional(),
      }),
    )
    .max(1000)
    .default([]),
});
export const salesLineInputSchema = z.object({
  variantId: z.uuid(),
  packagingLevelId: z.uuid().optional(),
  warehouseId: z.uuid(),
  packageQuantity: positiveDecimalStringSchema,
  conversionSnapshot: positiveDecimalStringSchema,
  packageUnitPrice: money,
  discountAmount: money.default("0"),
  taxAmount: money.default("0"),
});
export const salesQuotationInputSchema = z.object({
  customerId: z.uuid(),
  referenceNumber: reference,
  quotationDate: z.iso.date(),
  validUntil: z.iso.date(),
  currency,
  notes: z.string().trim().max(2000).optional(),
  lines: z.array(salesLineInputSchema).min(1).max(500),
});
export const salesOrderInputSchema = z.object({
  customerId: z.uuid(),
  quotationId: z.uuid().optional(),
  referenceNumber: reference,
  orderDate: z.iso.date(),
  expectedDeliveryDate: z.iso.date().optional(),
  currency,
  reserveStock: z.boolean().default(false),
  creditOverrideReason: z.string().trim().max(1000).optional(),
  lines: z.array(salesLineInputSchema).min(1).max(500),
});
export const stockReservationInputSchema = z.object({
  salesOrderId: z.uuid(),
  expiresAt: z.iso.datetime().optional(),
  lines: z
    .array(
      z.object({
        salesOrderLineId: z.uuid(),
        warehouseId: z.uuid(),
        baseQuantity: positiveDecimalStringSchema,
      }),
    )
    .min(1)
    .max(500),
});
export const deliveryInputSchema = z.object({
  salesOrderId: z.uuid(),
  referenceNumber: reference,
  dispatchDate: z.iso.date(),
  lines: z
    .array(
      z.object({
        salesOrderLineId: z.uuid(),
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
export const salesInvoiceInputSchema = z
  .object({
    customerId: z.uuid(),
    salesOrderId: z.uuid().optional(),
    deliveryChallanId: z.uuid().optional(),
    referenceNumber: reference,
    invoiceDate: z.iso.date(),
    currency,
    immediateDelivery: z.boolean().default(false),
    immediateDeliveryDetails: z
      .object({
        referenceNumber: reference,
        dispatchDate: z.iso.date(),
        lines: deliveryInputSchema.shape.lines,
      })
      .optional(),
    lines: z
      .array(salesLineInputSchema.extend({ deliveryChallanLineId: z.uuid().optional() }))
      .min(1)
      .max(500),
  })
  .superRefine((value, context) => {
    if (value.immediateDelivery && (!value.salesOrderId || !value.immediateDeliveryDetails))
      context.addIssue({
        code: "custom",
        path: ["immediateDeliveryDetails"],
        message: "Immediate delivery requires an approved sales order and dispatch details",
      });
    if (!value.immediateDelivery && value.immediateDeliveryDetails)
      context.addIssue({
        code: "custom",
        path: ["immediateDeliveryDetails"],
        message: "Dispatch details are valid only for immediate-delivery invoices",
      });
  });
export const salesReturnInputSchema = z.object({
  customerId: z.uuid(),
  salesInvoiceId: z.uuid().optional(),
  deliveryChallanId: z.uuid(),
  referenceNumber: reference,
  returnDate: z.iso.date(),
  reason: z.enum([
    "DAMAGE",
    "WRONG_ITEM",
    "DEFECTIVE",
    "CUSTOMER_REFUSAL",
    "EXCESS_DELIVERY",
    "EXPIRED",
    "OTHER",
  ]),
  condition: z.enum(["SALEABLE", "DAMAGED", "QUARANTINE", "SCRAP"]),
  lines: z
    .array(
      z.object({
        deliveryChallanLineId: z.uuid(),
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
export const creditNoteInputSchema = z.object({
  customerId: z.uuid(),
  salesInvoiceId: z.uuid().optional(),
  salesReturnId: z.uuid().optional(),
  referenceNumber: reference,
  creditDate: z.iso.date(),
  currency,
  reason: z.string().trim().min(3).max(1000),
  amount: positiveDecimalStringSchema,
});
export const customerPaymentInputSchema = z.object({
  customerId: z.uuid(),
  referenceNumber: reference,
  paymentDate: z.iso.date(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"]),
  currency,
  amount: positiveDecimalStringSchema,
  paymentReference: reference,
  allocations: z
    .array(z.object({ invoiceId: z.uuid(), amount: positiveDecimalStringSchema }))
    .min(1)
    .max(500),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerContactInput = z.infer<typeof customerContactInputSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;
export type CustomerCategoryInput = z.infer<typeof customerCategoryInputSchema>;
export type CustomerPriceAssignmentInput = z.infer<typeof customerPriceAssignmentInputSchema>;
export type PriceListInput = z.infer<typeof priceListInputSchema>;
export type SalesQuotationInput = z.infer<typeof salesQuotationInputSchema>;
export type SalesOrderInput = z.infer<typeof salesOrderInputSchema>;
export type StockReservationInput = z.infer<typeof stockReservationInputSchema>;
export type DeliveryInput = z.infer<typeof deliveryInputSchema>;
export type SalesInvoiceInput = z.infer<typeof salesInvoiceInputSchema>;
export type SalesReturnInput = z.infer<typeof salesReturnInputSchema>;
export type CreditNoteInput = z.infer<typeof creditNoteInputSchema>;
export type CustomerPaymentInput = z.infer<typeof customerPaymentInputSchema>;
