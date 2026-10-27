import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  goodsReceiptLines,
  goodsReceipts,
  landedCostAllocations,
  landedCostLines,
  landedCosts,
  purchaseInvoiceLines,
  purchaseInvoiceMatches,
  purchaseInvoices,
  purchaseOrderApprovals,
  purchaseRequisitionLines,
  purchaseRequisitions,
  purchaseOrderLines,
  purchaseOrders,
  purchaseReturnLines,
  purchaseReturns,
  supplierAddresses,
  supplierContacts,
  supplierPaymentAllocations,
  supplierPayments,
  suppliers,
} from "@erp/database/schema";
import { DatabaseService } from "../database/database.service.js";
import { FixedDecimal } from "../inventory/decimal.js";
import { InventoryService } from "../inventory/inventory.service.js";
import type {
  GoodsReceiptInput,
  LandedCostInput,
  PurchaseInvoiceInput,
  PurchaseOrderInput,
  PurchaseRequisitionInput,
  PurchaseReturnInput,
  SupplierAddressInput,
  SupplierContactInput,
  SupplierInput,
  SupplierPaymentInput,
} from "@erp/types";
type List = {
  search?: string;
  cursor?: string;
  limit: number;
};
type TenantTx = Parameters<Parameters<DatabaseService["withTenant"]>[1]>[0];
@Injectable()
export class PurchaseService {
  private readonly database: DatabaseService;
  private readonly inventory: InventoryService;
  constructor(database: DatabaseService, inventory: InventoryService) {
    this.database = database;
    this.inventory = inventory;
  }
  listSuppliers(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: suppliers.id,
          code: suppliers.code,
          displayName: suppliers.displayName,
          legalName: suppliers.legalName,
          active: suppliers.active,
          defaultCurrency: suppliers.defaultCurrency,
          paymentTermsDays: suppliers.paymentTermsDays,
          creditLimit: suppliers.creditLimit,
        })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.companyId, companyId),
            isNull(suppliers.archivedAt),
            q.cursor ? gt(suppliers.id, q.cursor) : undefined,
            q.search ? ilike(suppliers.displayName, `%${q.search}%`) : undefined,
          ),
        )
        .orderBy(asc(suppliers.id))
        .limit(q.limit),
    );
  }
  getSupplier(companyId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.companyId, companyId),
            eq(suppliers.id, id),
            isNull(suppliers.archivedAt),
          ),
        )
        .limit(1);
      if (!row) this.notFound("Supplier");
      return row;
    });
  }
  createSupplier(companyId: string, actorId: string, input: SupplierInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .insert(suppliers)
        .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      return row;
    });
  }
  updateSupplier(
    companyId: string,
    actorId: string,
    id: string,
    input: Partial<SupplierInput> & {
      active?: boolean;
    },
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(suppliers)
        .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(suppliers.companyId, companyId),
            eq(suppliers.id, id),
            isNull(suppliers.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Supplier");
      return row;
    });
  }
  archiveSupplier(companyId: string, actorId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(suppliers)
        .set({ active: false, archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(suppliers.companyId, companyId),
            eq(suppliers.id, id),
            isNull(suppliers.archivedAt),
          ),
        )
        .returning({ id: suppliers.id });
      if (!row) this.notFound("Supplier");
      return row;
    });
  }
  listSupplierContacts(companyId: string, supplierId: string) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      return tx
        .select()
        .from(supplierContacts)
        .where(
          and(
            eq(supplierContacts.companyId, companyId),
            eq(supplierContacts.supplierId, supplierId),
            isNull(supplierContacts.archivedAt),
          ),
        )
        .orderBy(asc(supplierContacts.id));
    });
  }
  createSupplierContact(
    companyId: string,
    actorId: string,
    supplierId: string,
    input: SupplierContactInput,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      if (input.primary)
        await tx
          .update(supplierContacts)
          .set({ primary: false, updatedAt: new Date(), updatedBy: actorId })
          .where(
            and(
              eq(supplierContacts.companyId, companyId),
              eq(supplierContacts.supplierId, supplierId),
              isNull(supplierContacts.archivedAt),
            ),
          );
      const [row] = await tx
        .insert(supplierContacts)
        .values({ companyId, supplierId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      if (!row) throw new Error("Supplier contact insert failed");
      return row;
    });
  }
  updateSupplierContact(
    companyId: string,
    actorId: string,
    supplierId: string,
    id: string,
    input: Partial<SupplierContactInput>,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      if (input.primary)
        await tx
          .update(supplierContacts)
          .set({ primary: false, updatedAt: new Date(), updatedBy: actorId })
          .where(
            and(
              eq(supplierContacts.companyId, companyId),
              eq(supplierContacts.supplierId, supplierId),
              isNull(supplierContacts.archivedAt),
            ),
          );
      const [row] = await tx
        .update(supplierContacts)
        .set({ ...input, updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(supplierContacts.companyId, companyId),
            eq(supplierContacts.supplierId, supplierId),
            eq(supplierContacts.id, id),
            isNull(supplierContacts.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Supplier contact");
      return row;
    });
  }
  archiveSupplierContact(companyId: string, actorId: string, supplierId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(supplierContacts)
        .set({ archivedAt: new Date(), primary: false, updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(supplierContacts.companyId, companyId),
            eq(supplierContacts.supplierId, supplierId),
            eq(supplierContacts.id, id),
            isNull(supplierContacts.archivedAt),
          ),
        )
        .returning({ id: supplierContacts.id });
      if (!row) this.notFound("Supplier contact");
      return row;
    });
  }
  listSupplierAddresses(companyId: string, supplierId: string) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      return tx
        .select()
        .from(supplierAddresses)
        .where(
          and(
            eq(supplierAddresses.companyId, companyId),
            eq(supplierAddresses.supplierId, supplierId),
            isNull(supplierAddresses.archivedAt),
          ),
        )
        .orderBy(asc(supplierAddresses.id));
    });
  }
  createSupplierAddress(
    companyId: string,
    actorId: string,
    supplierId: string,
    input: SupplierAddressInput,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      if (input.primary)
        await tx
          .update(supplierAddresses)
          .set({ primary: false, updatedAt: new Date(), updatedBy: actorId })
          .where(
            and(
              eq(supplierAddresses.companyId, companyId),
              eq(supplierAddresses.supplierId, supplierId),
              isNull(supplierAddresses.archivedAt),
            ),
          );
      const [row] = await tx
        .insert(supplierAddresses)
        .values({ companyId, supplierId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      if (!row) throw new Error("Supplier address insert failed");
      return row;
    });
  }
  updateSupplierAddress(
    companyId: string,
    actorId: string,
    supplierId: string,
    id: string,
    input: Partial<SupplierAddressInput>,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireSupplier(tx, companyId, supplierId);
      if (input.primary)
        await tx
          .update(supplierAddresses)
          .set({ primary: false, updatedAt: new Date(), updatedBy: actorId })
          .where(
            and(
              eq(supplierAddresses.companyId, companyId),
              eq(supplierAddresses.supplierId, supplierId),
              isNull(supplierAddresses.archivedAt),
            ),
          );
      const [row] = await tx
        .update(supplierAddresses)
        .set({ ...input, updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(supplierAddresses.companyId, companyId),
            eq(supplierAddresses.supplierId, supplierId),
            eq(supplierAddresses.id, id),
            isNull(supplierAddresses.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Supplier address");
      return row;
    });
  }
  archiveSupplierAddress(companyId: string, actorId: string, supplierId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(supplierAddresses)
        .set({ archivedAt: new Date(), primary: false, updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(supplierAddresses.companyId, companyId),
            eq(supplierAddresses.supplierId, supplierId),
            eq(supplierAddresses.id, id),
            isNull(supplierAddresses.archivedAt),
          ),
        )
        .returning({ id: supplierAddresses.id });
      if (!row) this.notFound("Supplier address");
      return row;
    });
  }
  listRequisitions(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(purchaseRequisitions)
        .where(
          and(
            eq(purchaseRequisitions.companyId, companyId),
            q.cursor ? gt(purchaseRequisitions.id, q.cursor) : undefined,
            q.search ? ilike(purchaseRequisitions.referenceNumber, `%${q.search}%`) : undefined,
          ),
        )
        .orderBy(asc(purchaseRequisitions.id))
        .limit(q.limit),
    );
  }
  getRequisition(companyId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [record] = await tx
        .select()
        .from(purchaseRequisitions)
        .where(and(eq(purchaseRequisitions.companyId, companyId), eq(purchaseRequisitions.id, id)))
        .limit(1);
      if (!record) this.notFound("Purchase requisition");
      const lines = await tx
        .select()
        .from(purchaseRequisitionLines)
        .where(
          and(
            eq(purchaseRequisitionLines.companyId, companyId),
            eq(purchaseRequisitionLines.requisitionId, id),
          ),
        )
        .orderBy(asc(purchaseRequisitionLines.id));
      return { ...record, lines };
    });
  }
  createRequisition(companyId: string, actorId: string, input: PurchaseRequisitionInput) {
    return this.database.withTenant(companyId, async (tx) =>
      this.writeRequisition(tx, companyId, actorId, input),
    );
  }
  updateRequisition(
    companyId: string,
    actorId: string,
    id: string,
    input: PurchaseRequisitionInput,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [record] = await tx
        .update(purchaseRequisitions)
        .set({
          referenceNumber: input.referenceNumber,
          businessDate: input.businessDate,
          requiredDate: input.requiredDate,
          warehouseId: input.warehouseId,
          notes: input.notes,
          updatedAt: new Date(),
          updatedBy: actorId,
          version: sql`${purchaseRequisitions.version} + 1`,
        })
        .where(
          and(
            eq(purchaseRequisitions.companyId, companyId),
            eq(purchaseRequisitions.id, id),
            eq(purchaseRequisitions.status, "DRAFT"),
          ),
        )
        .returning();
      if (!record)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Only draft requisitions may be edited",
        });
      await tx
        .delete(purchaseRequisitionLines)
        .where(
          and(
            eq(purchaseRequisitionLines.companyId, companyId),
            eq(purchaseRequisitionLines.requisitionId, id),
          ),
        );
      await this.insertRequisitionLines(tx, companyId, actorId, id, input);
      return record;
    });
  }
  submitRequisition(companyId: string, actorId: string, id: string) {
    return this.requisitionStatus(companyId, actorId, id, "DRAFT", "SUBMITTED");
  }
  decideRequisition(
    companyId: string,
    actorId: string,
    id: string,
    decision: "APPROVED" | "REJECTED" | "RETURNED",
    reason?: string,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const decidedAt = new Date();
      const [row] = await tx
        .update(purchaseRequisitions)
        .set({
          status: decision === "RETURNED" ? "DRAFT" : decision,
          submittedAt: decision === "RETURNED" ? null : undefined,
          approvedAt: decision === "APPROVED" ? decidedAt : null,
          approvedBy: decision === "APPROVED" ? actorId : null,
          decisionReason: reason,
          decidedAt,
          decidedBy: actorId,
          updatedAt: decidedAt,
          updatedBy: actorId,
        })
        .where(
          and(
            eq(purchaseRequisitions.companyId, companyId),
            eq(purchaseRequisitions.id, id),
            eq(purchaseRequisitions.status, "SUBMITTED"),
          ),
        )
        .returning();
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Only submitted requisitions may be decided",
        });
      return row;
    });
  }
  cancelRequisition(companyId: string, actorId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(purchaseRequisitions)
        .set({ status: "CANCELLED", updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(purchaseRequisitions.companyId, companyId),
            eq(purchaseRequisitions.id, id),
            or(
              eq(purchaseRequisitions.status, "DRAFT"),
              eq(purchaseRequisitions.status, "SUBMITTED"),
            ),
          ),
        )
        .returning();
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Requisition cannot be cancelled",
        });
      return row;
    });
  }
  listOrders(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.companyId, companyId),
            q.cursor ? gt(purchaseOrders.id, q.cursor) : undefined,
            q.search ? ilike(purchaseOrders.referenceNumber, `%${q.search}%`) : undefined,
          ),
        )
        .orderBy(asc(purchaseOrders.id))
        .limit(q.limit),
    );
  }
  createOrder(companyId: string, actorId: string, input: PurchaseOrderInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [supplier] = await tx
        .select({ id: suppliers.id, active: suppliers.active })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.companyId, companyId),
            eq(suppliers.id, input.supplierId),
            isNull(suppliers.archivedAt),
          ),
        )
        .limit(1);
      if (!supplier) this.notFound("Supplier");
      if (!supplier.active)
        throw new BadRequestException({
          code: "SUPPLIER_INACTIVE",
          message: "Supplier is not active",
        });
      if (input.requisitionId) {
        const [requisition] = await tx
          .select({ id: purchaseRequisitions.id })
          .from(purchaseRequisitions)
          .where(
            and(
              eq(purchaseRequisitions.companyId, companyId),
              eq(purchaseRequisitions.id, input.requisitionId),
              eq(purchaseRequisitions.status, "APPROVED"),
            ),
          )
          .limit(1);
        if (!requisition)
          throw new BadRequestException({
            code: "REQUISITION_NOT_APPROVED",
            message: "An approved requisition is required for conversion",
          });
        const [existingOrder] = await tx
          .select({ id: purchaseOrders.id })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.companyId, companyId),
              eq(purchaseOrders.requisitionId, input.requisitionId),
            ),
          )
          .limit(1);
        if (existingOrder)
          throw new BadRequestException({
            code: "REQUISITION_ALREADY_CONVERTED",
            message: "The requisition already has a purchase order",
          });
      }
      let subtotal = FixedDecimal.zero(),
        discount = FixedDecimal.zero(),
        tax = FixedDecimal.zero();
      const normalized = input.lines.map((line) => {
        const base = FixedDecimal.parse(line.packageQuantity).multiply(
          FixedDecimal.parse(line.conversionSnapshot),
        );
        const gross = FixedDecimal.parse(line.packageQuantity).multiply(
          FixedDecimal.parse(line.packageUnitPrice),
        );
        const lineTotal = gross
          .subtract(FixedDecimal.parse(line.discountAmount))
          .add(FixedDecimal.parse(line.taxAmount));
        subtotal = subtotal.add(gross);
        discount = discount.add(FixedDecimal.parse(line.discountAmount));
        tax = tax.add(FixedDecimal.parse(line.taxAmount));
        return { line, base, lineTotal };
      });
      const grand = subtotal.subtract(discount).add(tax);
      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          companyId,
          supplierId: input.supplierId,
          requisitionId: input.requisitionId,
          referenceNumber: input.referenceNumber,
          businessDate: input.orderDate,
          expectedDeliveryDate: input.expectedDeliveryDate,
          currency: input.currency,
          status: "DRAFT",
          subtotal: subtotal.toString(),
          discountTotal: discount.toString(),
          taxTotal: tax.toString(),
          grandTotal: grand.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!order) throw new Error("Purchase order insert failed");
      await tx.insert(purchaseOrderLines).values(
        normalized.map(({ line, base, lineTotal }) => ({
          companyId,
          purchaseOrderId: order.id,
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId,
          warehouseId: line.warehouseId,
          packageQuantity: line.packageQuantity,
          conversionSnapshot: line.conversionSnapshot,
          baseQuantity: base.toString(),
          packageUnitPrice: line.packageUnitPrice,
          discountAmount: line.discountAmount,
          taxAmount: line.taxAmount,
          lineTotal: lineTotal.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        })),
      );
      return order;
    });
  }
  approveOrder(
    companyId: string,
    actorId: string,
    id: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(purchaseOrders)
        .set({
          status: decision,
          approvedAt: decision === "APPROVED" ? new Date() : null,
          approvedBy: decision === "APPROVED" ? actorId : null,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(
          and(
            eq(purchaseOrders.companyId, companyId),
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.status, "SUBMITTED"),
          ),
        )
        .returning();
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Only submitted orders may be decided",
        });
      await tx.insert(purchaseOrderApprovals).values({
        companyId,
        purchaseOrderId: id,
        decision,
        reason,
        createdBy: actorId,
        updatedBy: actorId,
      });
      return row;
    });
  }
  submitOrder(companyId: string, actorId: string, id: string) {
    return this.orderStatus(companyId, actorId, id, "DRAFT", "SUBMITTED");
  }
  cancelOrder(companyId: string, actorId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(purchaseOrders)
        .set({ status: "CANCELLED", updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(purchaseOrders.companyId, companyId),
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.status, "DRAFT"),
          ),
        )
        .returning()
        .catch(() => []);
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Order cannot be cancelled",
        });
      return row;
    });
  }
  async postReceipt(companyId: string, actorId: string, input: GoodsReceiptInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.companyId, companyId),
            eq(purchaseOrders.id, input.purchaseOrderId),
            eq(purchaseOrders.status, "APPROVED"),
          ),
        )
        .limit(1);
      if (!order)
        throw new BadRequestException({
          code: "INVALID_PURCHASE_ORDER",
          message: "Approved purchase order not found",
        });
      const firstInputLine = input.lines[0];
      if (!firstInputLine) throw new Error("Receipt requires a line");
      const [receipt] = await tx
        .insert(goodsReceipts)
        .values({
          companyId,
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          warehouseId: firstInputLine.warehouseId,
          referenceNumber: input.referenceNumber,
          businessDate: input.receiptDate,
          status: "DRAFT",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!receipt) throw new Error("Receipt insert failed");
      const posting = [];
      const records = [];
      for (const inputLine of input.lines) {
        const [line] = await tx
          .select()
          .from(purchaseOrderLines)
          .where(
            and(
              eq(purchaseOrderLines.companyId, companyId),
              eq(purchaseOrderLines.id, inputLine.purchaseOrderLineId),
              eq(purchaseOrderLines.purchaseOrderId, order.id),
            ),
          )
          .limit(1);
        if (!line) this.notFound("Purchase order line");
        const accepted = FixedDecimal.parse(inputLine.packageQuantity).multiply(
          FixedDecimal.parse(line.conversionSnapshot),
        );
        const rejected = FixedDecimal.parse(inputLine.rejectedPackageQuantity).multiply(
          FixedDecimal.parse(line.conversionSnapshot),
        );
        const pending = FixedDecimal.parse(line.baseQuantity).subtract(
          FixedDecimal.parse(line.receivedBaseQuantity),
        );
        if (accepted.compare(pending) > 0)
          throw new BadRequestException({
            code: "RECEIPT_TOLERANCE_EXCEEDED",
            message: "Receipt exceeds pending quantity",
          });
        posting.push({
          variantId: line.variantId,
          packagingLevelId: line.packagingLevelId ?? undefined,
          packageQuantity: inputLine.packageQuantity,
          conversionSnapshot: line.conversionSnapshot,
          warehouseId: inputLine.warehouseId,
          locationId: inputLine.locationId,
          batchNumber: inputLine.batchNumber,
          expiryDate: inputLine.expiryDate,
          serialNumbers: inputLine.serialNumbers,
          unitCost: FixedDecimal.parse(line.packageUnitPrice)
            .divide(FixedDecimal.parse(line.conversionSnapshot))
            .toString(),
        });
        records.push({ inputLine, line, accepted, rejected });
      }
      const transactionId = await this.inventory.postPurchaseMovement(tx, companyId, actorId, {
        kind: "PURCHASE_RECEIPT",
        referenceType: "GOODS_RECEIPT",
        referenceId: receipt.id,
        referenceNumber: receipt.referenceNumber,
        businessDate: receipt.businessDate,
        lines: posting,
      });
      for (const r of records) {
        await tx.insert(goodsReceiptLines).values({
          companyId,
          goodsReceiptId: receipt.id,
          purchaseOrderLineId: r.line.id,
          variantId: r.line.variantId,
          packagingLevelId: r.line.packagingLevelId,
          warehouseId: r.inputLine.warehouseId,
          locationId: r.inputLine.locationId,
          packageQuantity: r.inputLine.packageQuantity,
          conversionSnapshot: r.line.conversionSnapshot,
          acceptedBaseQuantity: r.accepted.toString(),
          rejectedBaseQuantity: r.rejected.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        });
        await tx
          .update(purchaseOrderLines)
          .set({
            receivedBaseQuantity: FixedDecimal.parse(r.line.receivedBaseQuantity)
              .add(r.accepted)
              .toString(),
            updatedAt: new Date(),
            updatedBy: actorId,
          })
          .where(
            and(eq(purchaseOrderLines.companyId, companyId), eq(purchaseOrderLines.id, r.line.id)),
          );
      }
      const [posted] = await tx
        .update(goodsReceipts)
        .set({
          status: "POSTED",
          inventoryTransactionId: transactionId,
          postedAt: new Date(),
          postedBy: actorId,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(goodsReceipts.companyId, companyId), eq(goodsReceipts.id, receipt.id)))
        .returning();
      return posted;
    });
  }
  async createInvoice(companyId: string, actorId: string, input: PurchaseInvoiceInput) {
    return this.database.withTenant(companyId, async (tx) => {
      let total = FixedDecimal.zero();
      const prepared = [];
      for (const l of input.lines) {
        const issues = [];
        let ordered, received, orderedPrice, conversionSnapshot;
        if (!l.purchaseOrderLineId)
          throw new BadRequestException({
            code: "PURCHASE_ORDER_REQUIRED",
            message: "An approved purchase order line is required",
          });
        {
          const [po] = await tx
            .select()
            .from(purchaseOrderLines)
            .where(
              and(
                eq(purchaseOrderLines.companyId, companyId),
                eq(purchaseOrderLines.id, l.purchaseOrderLineId),
              ),
            )
            .limit(1);
          if (!po) this.notFound("Purchase order line");
          ordered = po.baseQuantity;
          received = FixedDecimal.parse(po.receivedBaseQuantity)
            .subtract(FixedDecimal.parse(po.returnedBaseQuantity))
            .toString();
          orderedPrice = po.packageUnitPrice;
          conversionSnapshot = po.conversionSnapshot;
          if (
            FixedDecimal.parse(l.invoicedBaseQuantity).compare(FixedDecimal.parse(received)) !== 0
          )
            issues.push("QUANTITY_MISMATCH");
          if (
            FixedDecimal.parse(l.packageUnitPrice).compare(
              FixedDecimal.parse(po.packageUnitPrice),
            ) !== 0
          )
            issues.push("PRICE_MISMATCH");
        }
        if (!conversionSnapshot) throw new Error("Invoice conversion snapshot missing");
        const lineTotal = FixedDecimal.parse(l.invoicedBaseQuantity)
          .divide(FixedDecimal.parse(conversionSnapshot))
          .multiply(FixedDecimal.parse(l.packageUnitPrice))
          .add(FixedDecimal.parse(l.taxAmount));
        total = total.add(lineTotal);
        prepared.push({ l, issues, ordered, received, orderedPrice, lineTotal });
      }
      const mismatch = prepared.some((x) => x.issues.length);
      const [invoice] = await tx
        .insert(purchaseInvoices)
        .values({
          companyId,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          referenceNumber: randomUUID(),
          supplierInvoiceNumber: input.supplierInvoiceNumber,
          businessDate: input.invoiceDate,
          currency: input.currency,
          invoiceTotal: total.toString(),
          outstandingAmount: total.toString(),
          matchStatus: mismatch ? "MISMATCH" : "MATCHED",
          status: mismatch ? "DISPUTED" : "PENDING_APPROVAL",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!invoice) throw new Error("Invoice insert failed");
      for (const p of prepared) {
        const [line] = await tx
          .insert(purchaseInvoiceLines)
          .values({
            companyId,
            purchaseInvoiceId: invoice.id,
            purchaseOrderLineId: p.l.purchaseOrderLineId,
            goodsReceiptLineId: p.l.goodsReceiptLineId,
            variantId: p.l.variantId,
            invoicedBaseQuantity: p.l.invoicedBaseQuantity,
            packageUnitPrice: p.l.packageUnitPrice,
            taxAmount: p.l.taxAmount,
            lineTotal: p.lineTotal.toString(),
            createdBy: actorId,
            updatedBy: actorId,
          })
          .returning();
        if (!line) throw new Error("Invoice line insert failed");
        await tx.insert(purchaseInvoiceMatches).values({
          companyId,
          purchaseInvoiceLineId: line.id,
          purchaseOrderLineId: p.l.purchaseOrderLineId,
          goodsReceiptLineId: p.l.goodsReceiptLineId,
          status: p.issues.length ? "MISMATCH" : "MATCHED",
          orderedBaseQuantity: p.ordered,
          receivedBaseQuantity: p.received,
          invoicedBaseQuantity: p.l.invoicedBaseQuantity,
          orderedPackagePrice: p.orderedPrice,
          invoicedPackagePrice: p.l.packageUnitPrice,
          issues: p.issues,
          createdBy: actorId,
          updatedBy: actorId,
        });
      }
      return invoice;
    });
  }
  async postReturn(companyId: string, actorId: string, input: PurchaseReturnInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const firstInputLine = input.lines[0];
      if (!firstInputLine) throw new Error("Receipt requires a line");
      const [receipt] = await tx
        .select()
        .from(goodsReceipts)
        .where(
          and(
            eq(goodsReceipts.companyId, companyId),
            eq(goodsReceipts.id, input.goodsReceiptId),
            eq(goodsReceipts.supplierId, input.supplierId),
            eq(goodsReceipts.status, "POSTED"),
          ),
        )
        .limit(1);
      if (!receipt) this.notFound("Goods receipt");
      const [record] = await tx
        .insert(purchaseReturns)
        .values({
          companyId,
          supplierId: input.supplierId,
          goodsReceiptId: input.goodsReceiptId,
          referenceNumber: input.referenceNumber,
          businessDate: input.returnDate,
          reason: input.reason,
          creditNoteReference: input.creditNoteReference,
          status: "DRAFT",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!record) throw new Error("Return insert failed");
      const posting = [];
      const rows = [];
      for (const l of input.lines) {
        const [received] = await tx
          .select()
          .from(goodsReceiptLines)
          .where(
            and(
              eq(goodsReceiptLines.companyId, companyId),
              eq(goodsReceiptLines.id, l.goodsReceiptLineId),
              eq(goodsReceiptLines.goodsReceiptId, input.goodsReceiptId),
            ),
          )
          .limit(1);
        if (!received) this.notFound("Goods receipt line");
        const [poLine] = await tx
          .select()
          .from(purchaseOrderLines)
          .where(
            and(
              eq(purchaseOrderLines.companyId, companyId),
              eq(purchaseOrderLines.id, received.purchaseOrderLineId),
            ),
          )
          .limit(1);
        if (!poLine) this.notFound("Purchase order line");
        const priorReturns = await tx
          .select({ baseQuantity: purchaseReturnLines.baseQuantity })
          .from(purchaseReturnLines)
          .where(
            and(
              eq(purchaseReturnLines.companyId, companyId),
              eq(purchaseReturnLines.goodsReceiptLineId, received.id),
            ),
          );
        const returnedForReceipt = priorReturns
          .map((row) => FixedDecimal.parse(row.baseQuantity))
          .reduce((sum, quantity) => sum.add(quantity), FixedDecimal.zero());
        const base = FixedDecimal.parse(l.packageQuantity).multiply(
            FixedDecimal.parse(received.conversionSnapshot),
          ),
          available = FixedDecimal.parse(received.acceptedBaseQuantity).subtract(
            returnedForReceipt,
          );
        if (base.compare(available) > 0)
          throw new BadRequestException({
            code: "RETURN_EXCEEDS_RECEIVED",
            message: "Return exceeds available received stock",
          });
        posting.push({
          variantId: received.variantId,
          packagingLevelId: received.packagingLevelId ?? undefined,
          packageQuantity: l.packageQuantity,
          conversionSnapshot: received.conversionSnapshot,
          warehouseId: l.warehouseId,
          locationId: l.locationId,
          batchNumber: l.batchNumber,
          expiryDate: l.expiryDate,
          serialNumbers: l.serialNumbers,
        });
        rows.push({ l, received, poLine, base });
      }
      const transactionId = await this.inventory.postPurchaseMovement(tx, companyId, actorId, {
        kind: "PURCHASE_RETURN",
        referenceType: "PURCHASE_RETURN",
        referenceId: record.id,
        referenceNumber: record.referenceNumber,
        businessDate: record.businessDate,
        lines: posting,
      });
      for (const r of rows) {
        await tx.insert(purchaseReturnLines).values({
          companyId,
          purchaseReturnId: record.id,
          goodsReceiptLineId: r.received.id,
          variantId: r.received.variantId,
          warehouseId: r.l.warehouseId,
          locationId: r.l.locationId,
          packageQuantity: r.l.packageQuantity,
          conversionSnapshot: r.received.conversionSnapshot,
          baseQuantity: r.base.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        });
        await tx
          .update(purchaseOrderLines)
          .set({
            returnedBaseQuantity: FixedDecimal.parse(r.poLine.returnedBaseQuantity)
              .add(r.base)
              .toString(),
            updatedAt: new Date(),
            updatedBy: actorId,
          })
          .where(
            and(
              eq(purchaseOrderLines.companyId, companyId),
              eq(purchaseOrderLines.id, r.poLine.id),
            ),
          );
      }
      const [posted] = await tx
        .update(purchaseReturns)
        .set({
          status: "POSTED",
          inventoryTransactionId: transactionId,
          postedAt: new Date(),
          postedBy: actorId,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(and(eq(purchaseReturns.companyId, companyId), eq(purchaseReturns.id, record.id)))
        .returning();
      return posted;
    });
  }
  createLandedCost(companyId: string, actorId: string, input: LandedCostInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const receiptLines = await tx
        .select()
        .from(goodsReceiptLines)
        .where(
          and(
            eq(goodsReceiptLines.companyId, companyId),
            eq(goodsReceiptLines.goodsReceiptId, input.goodsReceiptId),
          ),
        );
      if (!receiptLines.length) this.notFound("Goods receipt");
      const total = input.lines
        .map((x) => FixedDecimal.parse(x.amount))
        .reduce((a, b) => a.add(b), FixedDecimal.zero());
      const [record] = await tx
        .insert(landedCosts)
        .values({
          companyId,
          goodsReceiptId: input.goodsReceiptId,
          referenceNumber: input.referenceNumber,
          businessDate: new Date().toISOString().slice(0, 10),
          allocationMethod: input.allocationMethod,
          currency: input.currency,
          totalAmount: total.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!record) throw new Error("Landed cost insert failed");
      for (const cost of input.lines) {
        const [costLine] = await tx
          .insert(landedCostLines)
          .values({
            companyId,
            landedCostId: record.id,
            costType: cost.costType,
            amount: cost.amount,
            createdBy: actorId,
            updatedBy: actorId,
          })
          .returning();
        if (!costLine) throw new Error("Landed cost line insert failed");
        const basis = receiptLines.map((x) => FixedDecimal.parse(x.acceptedBaseQuantity)),
          sum = basis.reduce((a, b) => a.add(b), FixedDecimal.zero());
        let used = FixedDecimal.zero();
        for (const [i, line] of receiptLines.entries()) {
          const basisValue = basis[i];
          if (!basisValue) throw new Error("Landed cost basis missing");
          const allocated =
            i === receiptLines.length - 1
              ? FixedDecimal.parse(cost.amount).subtract(used)
              : FixedDecimal.parse(cost.amount).multiply(basisValue).divide(sum);
          used = used.add(allocated);
          await tx.insert(landedCostAllocations).values({
            companyId,
            landedCostId: record.id,
            landedCostLineId: costLine.id,
            goodsReceiptLineId: line.id,
            basisQuantity: line.acceptedBaseQuantity,
            allocatedAmount: allocated.toString(),
            effectiveCostPerBaseUnit: allocated.divide(basisValue).toString(),
            createdBy: actorId,
            updatedBy: actorId,
          });
        }
      }
      return record;
    });
  }
  recordPayment(companyId: string, actorId: string, input: SupplierPaymentInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const total = input.allocations
        .map((x) => FixedDecimal.parse(x.amount))
        .reduce((a, b) => a.add(b), FixedDecimal.zero());
      if (total.compare(FixedDecimal.parse(input.amount)) > 0)
        throw new BadRequestException({
          code: "PAYMENT_OVER_ALLOCATION",
          message: "Allocations exceed payment",
        });
      const checked = [];
      for (const a of input.allocations) {
        const [invoice] = await tx
          .select()
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.companyId, companyId),
              eq(purchaseInvoices.id, a.invoiceId),
              eq(purchaseInvoices.supplierId, input.supplierId),
            ),
          )
          .limit(1);
        if (!invoice) this.notFound("Purchase invoice");
        if (FixedDecimal.parse(a.amount).compare(FixedDecimal.parse(invoice.outstandingAmount)) > 0)
          throw new BadRequestException({
            code: "PAYMENT_OVER_ALLOCATION",
            message: "Allocation exceeds invoice outstanding",
          });
        checked.push({ a, invoice });
      }
      const [payment] = await tx
        .insert(supplierPayments)
        .values({
          companyId,
          supplierId: input.supplierId,
          referenceNumber: input.referenceNumber,
          businessDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          currency: input.currency,
          amount: input.amount,
          paymentReference: input.referenceNumber,
          status: "RECORDED",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!payment) throw new Error("Supplier payment insert failed");
      for (const { a, invoice } of checked) {
        await tx.insert(supplierPaymentAllocations).values({
          companyId,
          supplierPaymentId: payment.id,
          purchaseInvoiceId: invoice.id,
          allocatedAmount: a.amount,
          createdBy: actorId,
          updatedBy: actorId,
        });
        await tx
          .update(purchaseInvoices)
          .set({
            outstandingAmount: FixedDecimal.parse(invoice.outstandingAmount)
              .subtract(FixedDecimal.parse(a.amount))
              .toString(),
            updatedAt: new Date(),
            updatedBy: actorId,
          })
          .where(
            and(eq(purchaseInvoices.companyId, companyId), eq(purchaseInvoices.id, invoice.id)),
          );
      }
      return payment;
    });
  }
  private async requireSupplier(tx: TenantTx, companyId: string, id: string) {
    const [row] = await tx
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(eq(suppliers.companyId, companyId), eq(suppliers.id, id), isNull(suppliers.archivedAt)),
      )
      .limit(1);
    if (!row) this.notFound("Supplier");
    return row;
  }
  private async writeRequisition(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    input: PurchaseRequisitionInput,
  ) {
    const [record] = await tx
      .insert(purchaseRequisitions)
      .values({
        companyId,
        referenceNumber: input.referenceNumber,
        businessDate: input.businessDate,
        requiredDate: input.requiredDate,
        warehouseId: input.warehouseId,
        notes: input.notes,
        status: "DRAFT",
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    if (!record) throw new Error("Purchase requisition insert failed");
    await this.insertRequisitionLines(tx, companyId, actorId, record.id, input);
    return record;
  }
  private async insertRequisitionLines(
    tx: TenantTx,
    companyId: string,
    actorId: string,
    requisitionId: string,
    input: PurchaseRequisitionInput,
  ) {
    await tx.insert(purchaseRequisitionLines).values(
      input.lines.map((line) => ({
        companyId,
        requisitionId,
        variantId: line.variantId,
        packagingLevelId: line.packagingLevelId,
        packageQuantity: line.packageQuantity,
        conversionSnapshot: line.conversionSnapshot,
        baseQuantity: FixedDecimal.parse(line.packageQuantity)
          .multiply(FixedDecimal.parse(line.conversionSnapshot))
          .toString(),
        remarks: line.remarks,
        createdBy: actorId,
        updatedBy: actorId,
      })),
    );
  }
  private requisitionStatus(
    companyId: string,
    actorId: string,
    id: string,
    from: string,
    to: string,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(purchaseRequisitions)
        .set({
          status: to,
          submittedAt: to === "SUBMITTED" ? new Date() : undefined,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(
          and(
            eq(purchaseRequisitions.companyId, companyId),
            eq(purchaseRequisitions.id, id),
            eq(purchaseRequisitions.status, from),
          ),
        )
        .returning();
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Requisition state changed",
        });
      return row;
    });
  }
  private orderStatus(companyId: string, actorId: string, id: string, from: string, to: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(purchaseOrders)
        .set({ status: to, updatedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(purchaseOrders.companyId, companyId),
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.status, from),
          ),
        )
        .returning();
      if (!row)
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Order state changed",
        });
      return row;
    });
  }
  private notFound(name: string): never {
    throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `${name} was not found` });
  }
}
