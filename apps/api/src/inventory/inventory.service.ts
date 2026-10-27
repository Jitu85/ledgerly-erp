import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, ilike, isNull, or } from "drizzle-orm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  auditLogs,
  brands,
  inventoryBalanceProjections,
  inventoryTransactionLines,
  inventoryTransactions,
  productBarcodes,
  productCategories,
  productPackagingLevels,
  products,
  productVariants,
  serialNumbers,
  stockAdjustmentLines,
  stockAdjustments,
  stockBatches,
  stockCountLines,
  stockCounts,
  stockTransferLines,
  stockTransfers,
  unitsOfMeasurement,
  warehouseLocations,
  warehouses,
} from "@erp/database/schema";
import type {
  BrandInput,
  CategoryInput,
  OpeningStockInput,
  PackagingLevelInput,
  ProductInput,
  ProductVariantInput,
  StockAdjustmentInput,
  StockCountInput,
  StockTransferInput,
  UnitOfMeasurementInput,
  WarehouseInput,
  WarehouseLocationInput,
} from "@erp/types";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import { FixedDecimal } from "./decimal.js";

type ListOptions = { search?: string; cursor?: string; limit: number };
type TenantTx = Parameters<Parameters<DatabaseService["withTenant"]>[1]>[0];
type LineInput = OpeningStockInput["lines"][number];
type MovementKind =
  | "OPENING_STOCK"
  | "ADJUSTMENT_INCREASE"
  | "ADJUSTMENT_DECREASE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "COUNT_RECONCILIATION_INCREASE"
  | "COUNT_RECONCILIATION_DECREASE"
  | "PURCHASE_RECEIPT"
  | "PURCHASE_RETURN"
  | "SALES_DISPATCH"
  | "SALES_RETURN";

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}

  listUnits(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(unitsOfMeasurement)
        .where(
          and(
            eq(unitsOfMeasurement.companyId, companyId),
            isNull(unitsOfMeasurement.archivedAt),
            options.cursor ? gt(unitsOfMeasurement.id, options.cursor) : undefined,
            options.search
              ? or(
                  ilike(unitsOfMeasurement.name, `%${options.search}%`),
                  ilike(unitsOfMeasurement.code, `%${options.search}%`),
                )
              : undefined,
          ),
        )
        .orderBy(asc(unitsOfMeasurement.id))
        .limit(options.limit),
    );
  }
  createUnit(companyId: string, actorId: string, input: UnitOfMeasurementInput) {
    return this.database.withTenant(
      companyId,
      async (tx) =>
        (
          await tx
            .insert(unitsOfMeasurement)
            .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
            .returning()
        )[0],
    );
  }
  listCategories(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.companyId, companyId),
            isNull(productCategories.archivedAt),
            options.cursor ? gt(productCategories.id, options.cursor) : undefined,
            options.search ? ilike(productCategories.name, `%${options.search}%`) : undefined,
          ),
        )
        .orderBy(asc(productCategories.id))
        .limit(options.limit),
    );
  }
  createCategory(companyId: string, actorId: string, input: CategoryInput) {
    return this.database.withTenant(companyId, async (tx) => {
      if (input.parentId) await this.requireCategory(tx, companyId, input.parentId);
      return (
        await tx
          .insert(productCategories)
          .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }
  listBrands(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(brands)
        .where(
          and(
            eq(brands.companyId, companyId),
            isNull(brands.archivedAt),
            options.cursor ? gt(brands.id, options.cursor) : undefined,
            options.search ? ilike(brands.name, `%${options.search}%`) : undefined,
          ),
        )
        .orderBy(asc(brands.id))
        .limit(options.limit),
    );
  }
  createBrand(companyId: string, actorId: string, input: BrandInput) {
    return this.database.withTenant(
      companyId,
      async (tx) =>
        (
          await tx
            .insert(brands)
            .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
            .returning()
        )[0],
    );
  }
  listProducts(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          productType: products.productType,
          categoryId: products.categoryId,
          brandId: products.brandId,
          version: products.version,
        })
        .from(products)
        .where(
          and(
            eq(products.companyId, companyId),
            isNull(products.archivedAt),
            options.cursor ? gt(products.id, options.cursor) : undefined,
            options.search
              ? or(
                  ilike(products.name, `%${options.search}%`),
                  ilike(products.code, `%${options.search}%`),
                )
              : undefined,
          ),
        )
        .orderBy(asc(products.id))
        .limit(options.limit),
    );
  }
  getProduct(companyId: string, productId: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.companyId, companyId),
            eq(products.id, productId),
            isNull(products.archivedAt),
          ),
        )
        .limit(1);
      if (!product) this.notFound("Product");
      const variants = await tx
        .select()
        .from(productVariants)
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.productId, productId),
            isNull(productVariants.archivedAt),
          ),
        );
      return { ...product, variants };
    });
  }
  createProduct(companyId: string, actorId: string, input: ProductInput) {
    return this.database.withTenant(companyId, async (tx) => {
      if (input.categoryId) await this.requireCategory(tx, companyId, input.categoryId);
      if (input.brandId) await this.requireBrand(tx, companyId, input.brandId);
      return (
        await tx
          .insert(products)
          .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }
  createVariant(companyId: string, actorId: string, input: ProductVariantInput) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireProduct(tx, companyId, input.productId);
      await this.requireUnit(tx, companyId, input.baseUnitId);
      return (
        await tx
          .insert(productVariants)
          .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }
  listPackaging(companyId: string, variantId: string) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireVariant(tx, companyId, variantId);
      return tx
        .select()
        .from(productPackagingLevels)
        .where(
          and(
            eq(productPackagingLevels.companyId, companyId),
            eq(productPackagingLevels.variantId, variantId),
            isNull(productPackagingLevels.archivedAt),
          ),
        )
        .orderBy(asc(productPackagingLevels.baseUnitEquivalent));
    });
  }
  createPackaging(companyId: string, actorId: string, input: PackagingLevelInput) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireVariant(tx, companyId, input.variantId);
      if (input.parentPackagingLevelId) {
        const parent = await this.requirePackaging(tx, companyId, input.parentPackagingLevelId);
        if (parent.variantId !== input.variantId)
          throw new BadRequestException({
            code: "PACKAGING_VARIANT_MISMATCH",
            message: "Parent packaging belongs to another variant",
          });
      }
      const [created] = await tx
        .insert(productPackagingLevels)
        .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      if (input.barcode && created)
        await tx.insert(productBarcodes).values({
          companyId,
          variantId: input.variantId,
          packagingLevelId: created.id,
          value: input.barcode,
          createdBy: actorId,
          updatedBy: actorId,
        });
      return created;
    });
  }
  listWarehouses(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.companyId, companyId),
            isNull(warehouses.archivedAt),
            options.cursor ? gt(warehouses.id, options.cursor) : undefined,
            options.search ? ilike(warehouses.name, `%${options.search}%`) : undefined,
          ),
        )
        .orderBy(asc(warehouses.id))
        .limit(options.limit),
    );
  }
  createWarehouse(companyId: string, actorId: string, input: WarehouseInput) {
    return this.database.withTenant(
      companyId,
      async (tx) =>
        (
          await tx
            .insert(warehouses)
            .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
            .returning()
        )[0],
    );
  }
  listLocations(companyId: string, warehouseId: string) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireWarehouse(tx, companyId, warehouseId);
      return tx
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.companyId, companyId),
            eq(warehouseLocations.warehouseId, warehouseId),
            isNull(warehouseLocations.archivedAt),
          ),
        )
        .orderBy(asc(warehouseLocations.code));
    });
  }
  createLocation(companyId: string, actorId: string, input: WarehouseLocationInput) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireWarehouse(tx, companyId, input.warehouseId);
      if (input.parentLocationId) {
        const parent = await this.requireLocation(tx, companyId, input.parentLocationId);
        if (parent.warehouseId !== input.warehouseId)
          throw new BadRequestException({
            code: "LOCATION_WAREHOUSE_MISMATCH",
            message: "Parent location belongs to another warehouse",
          });
      }
      return (
        await tx
          .insert(warehouseLocations)
          .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }

  async postOpeningStock(
    companyId: string,
    actorId: string,
    input: OpeningStockInput,
    meta: RequestMetadata,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const transactionId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        "OPENING_STOCK",
        "opening_stock",
        input.referenceNumber,
        input.businessDate,
        input.notes,
      );
      for (const line of input.lines)
        await this.postLine(tx, companyId, actorId, transactionId, "OPENING_STOCK", line, false);
      await this.audit(
        tx,
        companyId,
        actorId,
        "inventory.opening_stock.posted",
        "inventory_transaction",
        transactionId,
        meta,
        { referenceNumber: input.referenceNumber },
      );
      return { id: transactionId, status: "POSTED" as const };
    });
  }

  async postAdjustment(
    companyId: string,
    actorId: string,
    input: StockAdjustmentInput,
    meta: RequestMetadata,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [document] = await tx
        .insert(stockAdjustments)
        .values({
          companyId,
          documentNumber: input.documentNumber,
          status: "POSTED",
          reasonCode: input.reasonCode,
          notes: input.notes,
          businessDate: input.businessDate,
          createdBy: actorId,
          approvedBy: actorId,
        })
        .returning();
      if (!document) throw new Error("Adjustment insert failed");
      const kind: MovementKind =
        input.direction === "INCREASE" ? "ADJUSTMENT_INCREASE" : "ADJUSTMENT_DECREASE";
      const transactionId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        kind,
        "stock_adjustment",
        input.documentNumber,
        input.businessDate,
        input.notes,
        document.id,
      );
      for (const line of input.lines) {
        const normalized = await this.normalizeLine(tx, companyId, line);
        await tx.insert(stockAdjustmentLines).values({
          companyId,
          adjustmentId: document.id,
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId,
          packageQuantity: line.packageQuantity,
          conversionFactorSnapshot: normalized.factor,
          baseQuantity: normalized.base,
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          batchId: normalized.batchId,
          serialNumbers: line.serialNumbers,
        });
        await this.postLine(
          tx,
          companyId,
          actorId,
          transactionId,
          kind,
          line,
          input.direction === "DECREASE",
        );
      }
      await tx
        .update(stockAdjustments)
        .set({ postedTransactionId: transactionId })
        .where(
          and(eq(stockAdjustments.companyId, companyId), eq(stockAdjustments.id, document.id)),
        );
      await this.audit(
        tx,
        companyId,
        actorId,
        "inventory.adjustment.posted",
        "stock_adjustment",
        document.id,
        meta,
        { direction: input.direction, reasonCode: input.reasonCode },
      );
      return { id: document.id, transactionId, status: "POSTED" as const };
    });
  }

  async postTransfer(
    companyId: string,
    actorId: string,
    input: StockTransferInput,
    meta: RequestMetadata,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireWarehouse(tx, companyId, input.sourceWarehouseId);
      await this.requireWarehouse(tx, companyId, input.destinationWarehouseId);
      const [document] = await tx
        .insert(stockTransfers)
        .values({
          companyId,
          documentNumber: input.documentNumber,
          status: "RECEIVED",
          sourceWarehouseId: input.sourceWarehouseId,
          destinationWarehouseId: input.destinationWarehouseId,
          businessDate: input.businessDate,
          notes: input.notes,
          createdBy: actorId,
          dispatchedBy: actorId,
          receivedBy: actorId,
        })
        .returning();
      if (!document) throw new Error("Transfer insert failed");
      const outId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        "TRANSFER_OUT",
        "stock_transfer",
        input.documentNumber,
        input.businessDate,
        input.notes,
        document.id,
      );
      const inId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        "TRANSFER_IN",
        "stock_transfer",
        input.documentNumber,
        input.businessDate,
        input.notes,
        document.id,
      );
      for (const line of input.lines) {
        const outgoing: LineInput = { ...line, warehouseId: input.sourceWarehouseId };
        const incoming: LineInput = { ...line, warehouseId: input.destinationWarehouseId };
        const normalized = await this.normalizeLine(tx, companyId, outgoing);
        await tx.insert(stockTransferLines).values({
          companyId,
          transferId: document.id,
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId,
          packageQuantity: line.packageQuantity,
          conversionFactorSnapshot: normalized.factor,
          baseQuantity: normalized.base,
          sourceLocationId: line.locationId,
          destinationLocationId: line.locationId,
          batchId: normalized.batchId,
          serialNumbers: line.serialNumbers,
        });
        await this.postLine(tx, companyId, actorId, outId, "TRANSFER_OUT", outgoing, true);
        await this.postLine(tx, companyId, actorId, inId, "TRANSFER_IN", incoming, false);
      }
      await this.audit(
        tx,
        companyId,
        actorId,
        "inventory.transfer.received",
        "stock_transfer",
        document.id,
        meta,
        {
          sourceWarehouseId: input.sourceWarehouseId,
          destinationWarehouseId: input.destinationWarehouseId,
        },
      );
      return {
        id: document.id,
        outTransactionId: outId,
        inTransactionId: inId,
        status: "RECEIVED" as const,
      };
    });
  }

  async postCount(
    companyId: string,
    actorId: string,
    input: StockCountInput,
    meta: RequestMetadata,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireWarehouse(tx, companyId, input.warehouseId);
      const [count] = await tx
        .insert(stockCounts)
        .values({
          companyId,
          documentNumber: input.documentNumber,
          status: "POSTED",
          warehouseId: input.warehouseId,
          snapshotAt: new Date(),
          createdBy: actorId,
          approvedBy: actorId,
          notes: input.notes,
        })
        .returning();
      if (!count) throw new Error("Count insert failed");
      const increaseId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        "COUNT_RECONCILIATION_INCREASE",
        "stock_count",
        input.documentNumber,
        new Date().toISOString().slice(0, 10),
        input.notes,
        count.id,
      );
      const decreaseId = await this.createTransaction(
        tx,
        companyId,
        actorId,
        "COUNT_RECONCILIATION_DECREASE",
        "stock_count",
        input.documentNumber,
        new Date().toISOString().slice(0, 10),
        input.notes,
        count.id,
      );
      for (const line of input.lines) {
        const factor = line.packagingLevelId
          ? (await this.requirePackaging(tx, companyId, line.packagingLevelId)).baseUnitEquivalent
          : "1";
        const counted = FixedDecimal.parse(line.countedPackageQuantity).multiply(
          FixedDecimal.parse(factor),
        );
        const key = this.dimensionKey(
          line.variantId,
          input.warehouseId,
          line.locationId,
          undefined,
        );
        const [projection] = await tx
          .select({ quantity: inventoryBalanceProjections.quantityBase })
          .from(inventoryBalanceProjections)
          .where(
            and(
              eq(inventoryBalanceProjections.companyId, companyId),
              eq(inventoryBalanceProjections.dimensionKey, key),
            ),
          )
          .limit(1);
        const system = FixedDecimal.parse(projection?.quantity ?? "0");
        const variance = counted.subtract(system);
        await tx.insert(stockCountLines).values({
          companyId,
          stockCountId: count.id,
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId,
          locationId: line.locationId,
          systemQuantityBase: system.toString(),
          countedPackageQuantity: line.countedPackageQuantity,
          conversionFactorSnapshot: factor,
          countedQuantityBase: counted.toString(),
          varianceQuantityBase: variance.toString(),
          countedBy: actorId,
          countedAt: new Date(),
          reason: line.reason,
        });
        if (!variance.equals(FixedDecimal.zero())) {
          const movement: LineInput = {
            variantId: line.variantId,
            packagingLevelId: line.packagingLevelId,
            packageQuantity: variance.isNegative()
              ? variance.negate().toString()
              : variance.toString(),
            warehouseId: input.warehouseId,
            locationId: line.locationId,
            batchNumber: line.batchNumber,
            serialNumbers: [],
          };
          await this.postLine(
            tx,
            companyId,
            actorId,
            variance.isNegative() ? decreaseId : increaseId,
            variance.isNegative()
              ? "COUNT_RECONCILIATION_DECREASE"
              : "COUNT_RECONCILIATION_INCREASE",
            movement,
            variance.isNegative(),
            "1",
          );
        }
      }
      await this.audit(
        tx,
        companyId,
        actorId,
        "inventory.count.posted",
        "stock_count",
        count.id,
        meta,
        {},
      );
      return { id: count.id, status: "POSTED" as const };
    });
  }

  ledger(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: inventoryTransactionLines.id,
          transactionId: inventoryTransactions.id,
          type: inventoryTransactions.transactionType,
          referenceNumber: inventoryTransactions.referenceNumber,
          businessDate: inventoryTransactions.businessDate,
          postedAt: inventoryTransactions.postedAt,
          variantId: inventoryTransactionLines.variantId,
          warehouseId: inventoryTransactionLines.warehouseId,
          locationId: inventoryTransactionLines.locationId,
          batchId: inventoryTransactionLines.batchId,
          serialNumberId: inventoryTransactionLines.serialNumberId,
          enteredQuantity: inventoryTransactionLines.enteredQuantity,
          conversionFactorSnapshot: inventoryTransactionLines.conversionFactorSnapshot,
          baseQuantity: inventoryTransactionLines.baseQuantity,
          postedBy: inventoryTransactions.createdBy,
          notes: inventoryTransactions.notes,
        })
        .from(inventoryTransactionLines)
        .innerJoin(
          inventoryTransactions,
          and(
            eq(inventoryTransactions.companyId, inventoryTransactionLines.companyId),
            eq(inventoryTransactions.id, inventoryTransactionLines.transactionId),
          ),
        )
        .where(
          and(
            eq(inventoryTransactionLines.companyId, companyId),
            options.cursor ? gt(inventoryTransactionLines.id, options.cursor) : undefined,
          ),
        )
        .orderBy(desc(inventoryTransactions.postedAt), desc(inventoryTransactionLines.id))
        .limit(options.limit),
    );
  }
  availability(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(inventoryBalanceProjections)
        .where(
          and(
            eq(inventoryBalanceProjections.companyId, companyId),
            options.cursor ? gt(inventoryBalanceProjections.id, options.cursor) : undefined,
          ),
        )
        .orderBy(asc(inventoryBalanceProjections.id))
        .limit(options.limit),
    );
  }
  batches(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(stockBatches)
        .where(
          and(
            eq(stockBatches.companyId, companyId),
            options.cursor ? gt(stockBatches.id, options.cursor) : undefined,
            options.search ? ilike(stockBatches.batchNumber, `%${options.search}%`) : undefined,
          ),
        )
        .orderBy(asc(stockBatches.id))
        .limit(options.limit),
    );
  }
  serials(companyId: string, options: ListOptions) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(serialNumbers)
        .where(
          and(
            eq(serialNumbers.companyId, companyId),
            options.cursor ? gt(serialNumbers.id, options.cursor) : undefined,
            options.search ? ilike(serialNumbers.serialNumber, `%${options.search}%`) : undefined,
          ),
        )
        .orderBy(asc(serialNumbers.id))
        .limit(options.limit),
    );
  }

  async postPurchaseMovement(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    input: {
      kind: "PURCHASE_RECEIPT" | "PURCHASE_RETURN";
      referenceType: "GOODS_RECEIPT" | "PURCHASE_RETURN";
      referenceId: string;
      referenceNumber: string;
      businessDate: string;
      notes?: string;
      lines: (LineInput & { conversionSnapshot: string })[];
    },
  ): Promise<string> {
    const transactionId = await this.createTransaction(
      tx,
      companyId,
      actorId,
      input.kind,
      input.referenceType,
      input.referenceNumber,
      input.businessDate,
      input.notes,
      input.referenceId,
    );
    for (const line of input.lines)
      await this.postLine(
        tx,
        companyId,
        actorId,
        transactionId,
        input.kind,
        line,
        input.kind === "PURCHASE_RETURN",
        line.conversionSnapshot,
      );
    return transactionId;
  }
  async postSalesMovement(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    input: {
      kind: "SALES_DISPATCH" | "SALES_RETURN";
      referenceType: "DELIVERY_CHALLAN" | "SALES_RETURN";
      referenceId: string;
      referenceNumber: string;
      businessDate: string;
      notes?: string;
      lines: (LineInput & { conversionSnapshot: string })[];
    },
  ): Promise<string> {
    const transactionId = await this.createTransaction(
      tx,
      companyId,
      actorId,
      input.kind,
      input.referenceType,
      input.referenceNumber,
      input.businessDate,
      input.notes,
      input.referenceId,
    );
    for (const line of input.lines)
      await this.postLine(
        tx,
        companyId,
        actorId,
        transactionId,
        input.kind,
        line,
        input.kind === "SALES_DISPATCH",
        line.conversionSnapshot,
      );
    return transactionId;
  }
  private async createTransaction(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    kind: MovementKind,
    referenceType: string,
    referenceNumber: string,
    businessDate: string,
    notes?: string,
    referenceId?: string,
  ): Promise<string> {
    const [created] = await tx
      .insert(inventoryTransactions)
      .values({
        companyId,
        transactionType: kind,
        referenceType,
        referenceId,
        referenceNumber,
        businessDate,
        postingBatchId: randomUUID(),
        notes,
        createdBy: actorId,
        approvedBy: actorId,
      })
      .returning({ id: inventoryTransactions.id });
    if (!created) throw new Error("Inventory transaction insert failed");
    return created.id;
  }

  private async postLine(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    transactionId: string,
    kind: MovementKind,
    line: LineInput,
    negative: boolean,
    forcedFactor?: string,
  ): Promise<void> {
    const normalized = await this.normalizeLine(tx, companyId, line, forcedFactor);
    let signed = FixedDecimal.parse(normalized.base);
    if (negative) signed = signed.negate();
    const dimensionKey = this.dimensionKey(
      line.variantId,
      line.warehouseId,
      line.locationId,
      normalized.batchId,
    );
    const [current] = await tx
      .select({ quantity: inventoryBalanceProjections.quantityBase })
      .from(inventoryBalanceProjections)
      .where(
        and(
          eq(inventoryBalanceProjections.companyId, companyId),
          eq(inventoryBalanceProjections.dimensionKey, dimensionKey),
        ),
      )
      .limit(1);
    const next = FixedDecimal.parse(current?.quantity ?? "0").add(signed);
    if (next.isNegative())
      throw new BadRequestException({
        code: "INSUFFICIENT_STOCK",
        message: "This posting would create negative stock",
      });
    const serialList = line.serialNumbers;
    if (normalized.variant.trackingMode === "SERIAL") {
      if (normalized.base.includes(".") || BigInt(normalized.base) !== BigInt(serialList.length))
        throw new BadRequestException({
          code: "TRACKING_DATA_REQUIRED",
          message: "Provide one unique serial number for every base unit",
        });
      for (const serial of serialList) {
        const [existing] = await tx
          .select({ id: serialNumbers.id })
          .from(serialNumbers)
          .where(
            and(
              eq(serialNumbers.companyId, companyId),
              eq(serialNumbers.variantId, line.variantId),
              eq(serialNumbers.serialNumber, serial),
            ),
          )
          .limit(1);
        if (!negative && existing && kind !== "TRANSFER_IN")
          throw new BadRequestException({
            code: "DUPLICATE_SERIAL",
            message: "A serial number already exists",
          });
        if (negative && !existing)
          throw new BadRequestException({
            code: "SERIAL_NOT_AVAILABLE",
            message: "A serial number is not available",
          });
        let serialId = existing?.id;
        if (!negative && existing && kind === "TRANSFER_IN") {
          await tx
            .update(serialNumbers)
            .set({
              status: "AVAILABLE",
              warehouseId: line.warehouseId,
              locationId: line.locationId,
              updatedAt: new Date(),
              updatedBy: actorId,
            })
            .where(and(eq(serialNumbers.companyId, companyId), eq(serialNumbers.id, existing.id)));
        } else if (!negative) {
          const [createdSerial] = await tx
            .insert(serialNumbers)
            .values({
              companyId,
              variantId: line.variantId,
              serialNumber: serial,
              status: "AVAILABLE",
              warehouseId: line.warehouseId,
              locationId: line.locationId,
              createdBy: actorId,
              updatedBy: actorId,
            })
            .returning({ id: serialNumbers.id });
          serialId = createdSerial?.id;
        } else if (serialId)
          await tx
            .update(serialNumbers)
            .set({
              status: kind === "TRANSFER_OUT" ? "IN_TRANSIT" : "ISSUED",
              warehouseId: null,
              locationId: null,
              updatedAt: new Date(),
              updatedBy: actorId,
            })
            .where(and(eq(serialNumbers.companyId, companyId), eq(serialNumbers.id, serialId)));
        await tx.insert(inventoryTransactionLines).values({
          companyId,
          transactionId,
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId,
          enteredQuantity: "1",
          conversionFactorSnapshot: "1",
          baseQuantity: negative ? "-1" : "1",
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          batchId: normalized.batchId,
          serialNumberId: serialId,
          unitCost: line.unitCost,
          totalValue: line.unitCost,
        });
      }
    } else
      await tx.insert(inventoryTransactionLines).values({
        companyId,
        transactionId,
        variantId: line.variantId,
        packagingLevelId: line.packagingLevelId,
        enteredQuantity: line.packageQuantity,
        conversionFactorSnapshot: normalized.factor,
        baseQuantity: signed.toString(),
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        batchId: normalized.batchId,
        unitCost: line.unitCost,
        totalValue: line.unitCost
          ? FixedDecimal.parse(line.unitCost)
              .multiply(FixedDecimal.parse(normalized.base))
              .toString()
          : undefined,
      });
    await tx
      .insert(inventoryBalanceProjections)
      .values({
        companyId,
        dimensionKey,
        variantId: line.variantId,
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        batchId: normalized.batchId,
        quantityBase: signed.toString(),
      })
      .onConflictDoUpdate({
        target: [inventoryBalanceProjections.companyId, inventoryBalanceProjections.dimensionKey],
        set: { quantityBase: next.toString(), updatedAt: new Date() },
      });
  }

  private async normalizeLine(
    tx: TenantTx,
    companyId: string,
    line: LineInput,
    forcedFactor?: string,
  ) {
    const variant = await this.requireVariant(tx, companyId, line.variantId);
    await this.requireWarehouse(tx, companyId, line.warehouseId);
    if (line.locationId) {
      const location = await this.requireLocation(tx, companyId, line.locationId);
      if (location.warehouseId !== line.warehouseId)
        throw new BadRequestException({
          code: "LOCATION_WAREHOUSE_MISMATCH",
          message: "Location belongs to another warehouse",
        });
    }
    const factor =
      forcedFactor ??
      (line.packagingLevelId
        ? (await this.requirePackaging(tx, companyId, line.packagingLevelId)).baseUnitEquivalent
        : "1");
    const base = FixedDecimal.parse(line.packageQuantity)
      .multiply(FixedDecimal.parse(factor))
      .toString();
    if (variant.trackingMode === "BATCH" && !line.batchNumber)
      throw new BadRequestException({
        code: "TRACKING_DATA_REQUIRED",
        message: "A batch number is required",
      });
    let batchId: string | undefined;
    if (line.batchNumber) {
      const [existing] = await tx
        .select({ id: stockBatches.id })
        .from(stockBatches)
        .where(
          and(
            eq(stockBatches.companyId, companyId),
            eq(stockBatches.variantId, line.variantId),
            eq(stockBatches.batchNumber, line.batchNumber),
          ),
        )
        .limit(1);
      batchId = existing?.id;
      if (!batchId) {
        if (variant.expiryTracking && !line.expiryDate)
          throw new BadRequestException({
            code: "TRACKING_DATA_REQUIRED",
            message: "An expiry date is required for a new batch",
          });
        const [created] = await tx
          .insert(stockBatches)
          .values({
            companyId,
            variantId: line.variantId,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            createdBy: null,
          })
          .returning({ id: stockBatches.id });
        batchId = created?.id;
      }
    }
    return { variant, factor, base, batchId };
  }

  private dimensionKey(
    variantId: string,
    warehouseId: string,
    locationId?: string,
    batchId?: string,
  ): string {
    return [variantId, warehouseId, locationId ?? "-", batchId ?? "-"].join(":");
  }
  private async requireUnit(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(unitsOfMeasurement)
      .where(
        and(
          eq(unitsOfMeasurement.companyId, companyId),
          eq(unitsOfMeasurement.id, id),
          isNull(unitsOfMeasurement.archivedAt),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Unit");
    return row;
  }
  private async requireCategory(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.companyId, companyId),
          eq(productCategories.id, id),
          isNull(productCategories.archivedAt),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Category");
    return row;
  }
  private async requireBrand(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(brands)
      .where(and(eq(brands.companyId, companyId), eq(brands.id, id), isNull(brands.archivedAt)))
      .limit(1);
    if (!row) this.notFound("Brand");
    return row;
  }
  private async requireProduct(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.id, id), isNull(products.archivedAt)),
      )
      .limit(1);
    if (!row) this.notFound("Product");
    return row;
  }
  private async requireVariant(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, id),
          isNull(productVariants.archivedAt),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Variant");
    return row;
  }
  private async requirePackaging(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(productPackagingLevels)
      .where(
        and(
          eq(productPackagingLevels.companyId, companyId),
          eq(productPackagingLevels.id, id),
          isNull(productPackagingLevels.archivedAt),
          eq(productPackagingLevels.active, true),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Packaging level");
    return row;
  }
  private async requireWarehouse(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.companyId, companyId),
          eq(warehouses.id, id),
          isNull(warehouses.archivedAt),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Warehouse");
    return row;
  }
  private async requireLocation(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(warehouseLocations)
      .where(
        and(
          eq(warehouseLocations.companyId, companyId),
          eq(warehouseLocations.id, id),
          isNull(warehouseLocations.archivedAt),
        ),
      )
      .limit(1);
    if (!row) this.notFound("Warehouse location");
    return row;
  }
  private notFound(resource: string): never {
    throw new NotFoundException({
      code: "RESOURCE_NOT_FOUND",
      message: `${resource} was not found`,
    });
  }
  private async audit(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    meta: RequestMetadata,
    metadata: Record<string, unknown>,
  ) {
    await tx.insert(auditLogs).values({
      companyId,
      actorUserId: actorId,
      action,
      outcome: "SUCCESS",
      targetType,
      targetId,
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata,
    });
  }
}
