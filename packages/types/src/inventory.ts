import { z } from "zod";

export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/, "Use a decimal value with up to 8 places");
export const positiveDecimalStringSchema = decimalStringSchema.refine(
  (value) => !value.startsWith("-") && value !== "0" && !/^0\.0*$/.test(value),
  "Value must be greater than zero",
);

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const nameSchema = z.string().trim().min(1).max(160);
const notesSchema = z.string().trim().min(3).max(2000);

export const unitOfMeasurementInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  symbol: z.string().trim().min(1).max(16),
  dimension: z.enum(["COUNT", "MASS", "VOLUME", "LENGTH", "AREA", "CUSTOM"]),
  decimalScale: z.number().int().min(0).max(8),
});

export const categoryInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
  parentId: z.uuid().optional(),
});

export const brandInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
});

export const productInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(4000).optional(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
  productType: z.enum(["GOODS", "SERVICE"]).default("GOODS"),
  imageReferences: z.array(z.string().trim().max(500)).max(12).default([]),
});

export const productVariantInputSchema = z
  .object({
    productId: z.uuid(),
    baseUnitId: z.uuid(),
    sku: codeSchema,
    name: nameSchema,
    attributes: z.record(z.string(), z.string().max(120)).default({}),
    stockTracked: z.boolean().default(true),
    trackingMode: z.enum(["NONE", "BATCH", "SERIAL"]).default("NONE"),
    expiryTracking: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.expiryTracking && value.trackingMode !== "BATCH")
      context.addIssue({
        code: "custom",
        path: ["expiryTracking"],
        message: "Expiry tracking requires batch tracking",
      });
  });

export const packagingLevelInputSchema = z.object({
  variantId: z.uuid(),
  parentPackagingLevelId: z.uuid().optional(),
  name: nameSchema,
  code: codeSchema,
  conversionQuantity: positiveDecimalStringSchema,
  baseUnitEquivalent: positiveDecimalStringSchema,
  barcode: z.string().trim().min(3).max(80).optional(),
  purchasePrice: positiveDecimalStringSchema.optional(),
  sellingPrice: positiveDecimalStringSchema.optional(),
  weight: positiveDecimalStringSchema.optional(),
  length: positiveDecimalStringSchema.optional(),
  width: positiveDecimalStringSchema.optional(),
  height: positiveDecimalStringSchema.optional(),
  effectiveFrom: z.iso.date(),
});

export const warehouseInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  locationTracking: z.boolean().default(false),
});

export const warehouseLocationInputSchema = z.object({
  warehouseId: z.uuid(),
  parentLocationId: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  locationType: z.enum(["ZONE", "RACK", "SHELF", "BIN", "RECEIVING", "QUARANTINE", "DISPATCH"]),
});

export const inventoryLineInputSchema = z.object({
  variantId: z.uuid(),
  packagingLevelId: z.uuid().optional(),
  packageQuantity: positiveDecimalStringSchema,
  warehouseId: z.uuid(),
  locationId: z.uuid().optional(),
  batchNumber: z.string().trim().min(1).max(100).optional(),
  expiryDate: z.iso.date().optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(160)).max(1000).default([]),
  unitCost: positiveDecimalStringSchema.optional(),
});

export const openingStockInputSchema = z.object({
  referenceNumber: z.string().trim().min(1).max(80),
  businessDate: z.iso.date(),
  notes: notesSchema,
  lines: z.array(inventoryLineInputSchema).min(1).max(500),
});

export const stockAdjustmentInputSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  businessDate: z.iso.date(),
  direction: z.enum(["INCREASE", "DECREASE"]),
  reasonCode: z.enum([
    "DAMAGE",
    "BREAKAGE",
    "EXPIRY",
    "THEFT",
    "SHORTAGE",
    "SURPLUS",
    "CORRECTION",
    "OTHER",
  ]),
  notes: notesSchema,
  lines: z.array(inventoryLineInputSchema).min(1).max(500),
});

export const stockTransferInputSchema = z
  .object({
    documentNumber: z.string().trim().min(1).max(80),
    businessDate: z.iso.date(),
    sourceWarehouseId: z.uuid(),
    destinationWarehouseId: z.uuid(),
    notes: z.string().trim().max(2000).optional(),
    lines: z
      .array(inventoryLineInputSchema.omit({ warehouseId: true }))
      .min(1)
      .max(500),
  })
  .refine((value) => value.sourceWarehouseId !== value.destinationWarehouseId, {
    path: ["destinationWarehouseId"],
    message: "Destination warehouse must differ from source warehouse",
  });

export const stockCountInputSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  warehouseId: z.uuid(),
  notes: z.string().trim().max(2000).optional(),
  lines: z
    .array(
      z.object({
        variantId: z.uuid(),
        packagingLevelId: z.uuid().optional(),
        locationId: z.uuid().optional(),
        batchNumber: z.string().trim().max(100).optional(),
        countedPackageQuantity: decimalStringSchema,
        reason: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

export const archiveInputSchema = z.object({ reason: notesSchema });
export const inventoryListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type UnitOfMeasurementInput = z.infer<typeof unitOfMeasurementInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type BrandInput = z.infer<typeof brandInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type PackagingLevelInput = z.infer<typeof packagingLevelInputSchema>;
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;
export type WarehouseLocationInput = z.infer<typeof warehouseLocationInputSchema>;
export type OpeningStockInput = z.infer<typeof openingStockInputSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInputSchema>;
export type StockTransferInput = z.infer<typeof stockTransferInputSchema>;
export type StockCountInput = z.infer<typeof stockCountInputSchema>;
