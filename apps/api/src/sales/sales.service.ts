import { and, asc, eq, gt, ilike, isNull, sql } from "drizzle-orm";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  customerAddresses,
  customerCategories,
  customerContacts,
  customerPriceAssignments,
  customerPaymentAllocations,
  customerPayments,
  customers,
  creditNotes,
  deliveryChallanLines,
  deliveryChallans,
  inventoryBalanceProjections,
  priceListItems,
  priceLists,
  salesInvoiceLines,
  salesInvoices,
  salesOrderApprovals,
  salesOrderLines,
  salesOrders,
  salesQuotationLines,
  salesQuotations,
  salesReturnLines,
  salesReturns,
  stockReservationLines,
  stockReservations,
} from "@erp/database/schema";
import type {
  CustomerAddressInput,
  CustomerCategoryInput,
  CustomerContactInput,
  CustomerInput,
  CustomerPaymentInput,
  CustomerPriceAssignmentInput,
  CreditNoteInput,
  DeliveryInput,
  PriceListInput,
  SalesInvoiceInput,
  SalesOrderInput,
  SalesQuotationInput,
  SalesReturnInput,
  StockReservationInput,
} from "@erp/types";
import { DatabaseService } from "../database/database.service.js";
import { FixedDecimal } from "../inventory/decimal.js";
import { InventoryService } from "../inventory/inventory.service.js";
type List = { search?: string; cursor?: string; limit: number };
type Tx = Parameters<Parameters<DatabaseService["withTenant"]>[1]>[0];
@Injectable()
export class SalesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inventory: InventoryService,
  ) {}
  listCustomers(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          id: customers.id,
          code: customers.code,
          displayName: customers.displayName,
          legalName: customers.legalName,
          active: customers.active,
          defaultCurrency: customers.defaultCurrency,
          paymentTermsDays: customers.paymentTermsDays,
          creditLimit: customers.creditLimit,
        })
        .from(customers)
        .where(
          and(
            eq(customers.companyId, companyId),
            isNull(customers.archivedAt),
            q.cursor ? gt(customers.id, q.cursor) : undefined,
            q.search ? ilike(customers.displayName, `%${q.search}%`) : undefined,
          ),
        )
        .orderBy(asc(customers.id))
        .limit(q.limit),
    );
  }
  getCustomer(companyId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.companyId, companyId),
            eq(customers.id, id),
            isNull(customers.archivedAt),
          ),
        )
        .limit(1);
      if (!row) this.notFound("Customer");
      return row;
    });
  }
  createCustomer(companyId: string, actorId: string, input: CustomerInput) {
    return this.database.withTenant(
      companyId,
      async (tx) =>
        (
          await tx
            .insert(customers)
            .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
            .returning()
        )[0],
    );
  }
  updateCustomer(
    companyId: string,
    actorId: string,
    id: string,
    input: Partial<CustomerInput> & { active?: boolean },
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(customers)
        .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(customers.companyId, companyId),
            eq(customers.id, id),
            isNull(customers.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Customer");
      return row;
    });
  }
  archiveCustomer(companyId: string, actorId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(customers)
        .set({ active: false, archivedAt: new Date(), updatedBy: actorId })
        .where(
          and(
            eq(customers.companyId, companyId),
            eq(customers.id, id),
            isNull(customers.archivedAt),
          ),
        )
        .returning({ id: customers.id });
      if (!row) this.notFound("Customer");
      return row;
    });
  }
  listContacts(companyId: string, customerId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(customerContacts)
        .where(
          and(
            eq(customerContacts.companyId, companyId),
            eq(customerContacts.customerId, customerId),
            isNull(customerContacts.archivedAt),
          ),
        ),
    );
  }
  updateContact(
    companyId: string,
    actorId: string,
    customerId: string,
    id: string,
    input: Partial<CustomerContactInput>,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, customerId);
      const [row] = await tx
        .update(customerContacts)
        .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(customerContacts.companyId, companyId),
            eq(customerContacts.customerId, customerId),
            eq(customerContacts.id, id),
            isNull(customerContacts.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Customer contact");
      return row;
    });
  }
  archiveContact(companyId: string, actorId: string, customerId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(customerContacts)
        .set({ archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(customerContacts.companyId, companyId),
            eq(customerContacts.customerId, customerId),
            eq(customerContacts.id, id),
            isNull(customerContacts.archivedAt),
          ),
        )
        .returning({ id: customerContacts.id });
      if (!row) this.notFound("Customer contact");
      return row;
    });
  }
  createContact(
    companyId: string,
    actorId: string,
    customerId: string,
    input: CustomerContactInput,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, customerId);
      return (
        await tx
          .insert(customerContacts)
          .values({ companyId, customerId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }
  listAddresses(companyId: string, customerId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(customerAddresses)
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
            isNull(customerAddresses.archivedAt),
          ),
        ),
    );
  }
  createAddress(
    companyId: string,
    actorId: string,
    customerId: string,
    input: CustomerAddressInput,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, customerId);
      return (
        await tx
          .insert(customerAddresses)
          .values({ companyId, customerId, ...input, createdBy: actorId, updatedBy: actorId })
          .returning()
      )[0];
    });
  }
  updateAddress(
    companyId: string,
    actorId: string,
    customerId: string,
    id: string,
    input: Partial<CustomerAddressInput>,
  ) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, customerId);
      const [row] = await tx
        .update(customerAddresses)
        .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
            eq(customerAddresses.id, id),
            isNull(customerAddresses.archivedAt),
          ),
        )
        .returning();
      if (!row) this.notFound("Customer address");
      return row;
    });
  }
  archiveAddress(companyId: string, actorId: string, customerId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(customerAddresses)
        .set({ archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
            eq(customerAddresses.id, id),
            isNull(customerAddresses.archivedAt),
          ),
        )
        .returning({ id: customerAddresses.id });
      if (!row) this.notFound("Customer address");
      return row;
    });
  }
  listCustomerCategories(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(customerCategories)
        .where(
          and(
            eq(customerCategories.companyId, companyId),
            isNull(customerCategories.archivedAt),
            q.cursor ? gt(customerCategories.id, q.cursor) : undefined,
            q.search ? ilike(customerCategories.name, `%${q.search}%`) : undefined,
          ),
        )
        .orderBy(asc(customerCategories.id))
        .limit(q.limit),
    );
  }
  createCustomerCategory(companyId: string, actorId: string, input: CustomerCategoryInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .insert(customerCategories)
        .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      return row;
    });
  }
  listPriceLists(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(priceLists)
        .where(
          and(
            eq(priceLists.companyId, companyId),
            isNull(priceLists.archivedAt),
            q.cursor ? gt(priceLists.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(priceLists.id))
        .limit(q.limit),
    );
  }
  createPriceList(companyId: string, actorId: string, input: PriceListInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .insert(priceLists)
        .values({
          companyId,
          code: input.code,
          name: input.name,
          currency: input.currency,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          taxInclusive: input.taxInclusive,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!row) throw new Error("Price list insert failed");
      if (input.items.length)
        await tx.insert(priceListItems).values(
          input.items.map((x) => ({
            companyId,
            priceListId: row.id,
            variantId: x.variantId,
            packagingLevelId: x.packagingLevelId,
            unitPrice: x.unitPrice,
            minimumSellingPrice: x.minSellingPrice,
            effectiveFrom: x.effectiveFrom,
            effectiveTo: x.effectiveTo,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        );
      return row;
    });
  }
  archivePriceList(companyId: string, actorId: string, id: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(priceLists)
        .set({ archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() })
        .where(
          and(
            eq(priceLists.companyId, companyId),
            eq(priceLists.id, id),
            isNull(priceLists.archivedAt),
          ),
        )
        .returning({ id: priceLists.id });
      if (!row) this.notFound("Price list");
      return row;
    });
  }
  assignPriceList(companyId: string, actorId: string, input: CustomerPriceAssignmentInput) {
    return this.database.withTenant(companyId, async (tx) => {
      if (input.customerId) await this.requireCustomer(tx, companyId, input.customerId);
      const [priceList] = await tx
        .select({ id: priceLists.id })
        .from(priceLists)
        .where(
          and(
            eq(priceLists.companyId, companyId),
            eq(priceLists.id, input.priceListId),
            isNull(priceLists.archivedAt),
          ),
        )
        .limit(1);
      if (!priceList) this.notFound("Price list");
      const [row] = await tx
        .insert(customerPriceAssignments)
        .values({ companyId, ...input, createdBy: actorId, updatedBy: actorId })
        .returning();
      return row;
    });
  }
  listQuotations(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(salesQuotations)
        .where(
          and(
            eq(salesQuotations.companyId, companyId),
            q.cursor ? gt(salesQuotations.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(salesQuotations.id))
        .limit(q.limit),
    );
  }
  createQuotation(companyId: string, actorId: string, input: SalesQuotationInput) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, input.customerId);
      const totals = this.totals(input.lines);
      const [doc] = await tx
        .insert(salesQuotations)
        .values({
          companyId,
          customerId: input.customerId,
          referenceNumber: input.referenceNumber,
          businessDate: input.quotationDate,
          validUntil: input.validUntil,
          currency: input.currency,
          notes: input.notes,
          ...totals,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!doc) throw new Error("Quotation insert failed");
      await tx.insert(salesQuotationLines).values(
        input.lines.map((x) => ({
          ...this.lineValues(companyId, actorId, x),
          quotationId: doc.id,
        })),
      );
      return doc;
    });
  }
  quotationAction(companyId: string, actorId: string, id: string, status: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [row] = await tx
        .update(salesQuotations)
        .set({
          status,
          updatedBy: actorId,
          updatedAt: new Date(),
          ...(status === "SENT" ? { sentAt: new Date() } : {}),
          ...(status === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
        })
        .where(and(eq(salesQuotations.companyId, companyId), eq(salesQuotations.id, id)))
        .returning();
      if (!row) this.notFound("Quotation");
      return row;
    });
  }
  listOrders(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(salesOrders)
        .where(
          and(
            eq(salesOrders.companyId, companyId),
            q.cursor ? gt(salesOrders.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(salesOrders.id))
        .limit(q.limit),
    );
  }
  createOrder(companyId: string, actorId: string, input: SalesOrderInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const customer = await this.requireCustomer(tx, companyId, input.customerId);
      if (!customer.active)
        throw new BadRequestException({
          code: "CUSTOMER_INACTIVE",
          message: "Customer is inactive",
        });
      const totals = this.totals(input.lines);
      const [doc] = await tx
        .insert(salesOrders)
        .values({
          companyId,
          customerId: input.customerId,
          quotationId: input.quotationId,
          referenceNumber: input.referenceNumber,
          businessDate: input.orderDate,
          expectedDeliveryDate: input.expectedDeliveryDate,
          currency: input.currency,
          creditOverrideReason: input.creditOverrideReason,
          ...totals,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!doc) throw new Error("Order insert failed");
      await tx.insert(salesOrderLines).values(
        input.lines.map((x) => ({
          ...this.lineValues(companyId, actorId, x),
          salesOrderId: doc.id,
        })),
      );
      return doc;
    });
  }
  orderAction(companyId: string, actorId: string, id: string, status: string, reason?: string) {
    return this.database.withTenant(companyId, async (tx) => {
      const [doc] = await tx
        .update(salesOrders)
        .set({
          status,
          updatedBy: actorId,
          updatedAt: new Date(),
          ...(status === "SUBMITTED" ? { submittedAt: new Date() } : {}),
          ...(status === "APPROVED" ? { approvedAt: new Date(), approvedBy: actorId } : {}),
        })
        .where(and(eq(salesOrders.companyId, companyId), eq(salesOrders.id, id)))
        .returning();
      if (!doc) this.notFound("Sales order");
      if (status === "APPROVED" || status === "REJECTED")
        await tx.insert(salesOrderApprovals).values({
          companyId,
          salesOrderId: id,
          decision: status,
          reason,
          createdBy: actorId,
          updatedBy: actorId,
        });
      return doc;
    });
  }
  listReservations(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(stockReservations)
        .where(
          and(
            eq(stockReservations.companyId, companyId),
            q.cursor ? gt(stockReservations.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(stockReservations.id))
        .limit(q.limit),
    );
  }
  reserve(companyId: string, actorId: string, input: StockReservationInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [order] = await tx
        .select()
        .from(salesOrders)
        .where(and(eq(salesOrders.companyId, companyId), eq(salesOrders.id, input.salesOrderId)))
        .limit(1);
      if (order?.status !== "APPROVED")
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Approved order required",
        });
      const [header] = await tx
        .insert(stockReservations)
        .values({
          companyId,
          salesOrderId: order.id,
          referenceNumber: `RSV-${order.referenceNumber}`,
          businessDate: new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!header) throw new Error("Reservation insert failed");
      for (const line of input.lines) {
        const [orderLine] = await tx
          .select()
          .from(salesOrderLines)
          .where(
            and(
              eq(salesOrderLines.companyId, companyId),
              eq(salesOrderLines.id, line.salesOrderLineId),
              eq(salesOrderLines.salesOrderId, order.id),
            ),
          )
          .limit(1);
        if (!orderLine) this.notFound("Sales order line");
        const [balance] = await tx
          .select({
            quantity: sql<string>`coalesce(sum(${inventoryBalanceProjections.quantityBase}),0)`,
          })
          .from(inventoryBalanceProjections)
          .where(
            and(
              eq(inventoryBalanceProjections.companyId, companyId),
              eq(inventoryBalanceProjections.variantId, orderLine.variantId),
              eq(inventoryBalanceProjections.warehouseId, line.warehouseId),
            ),
          );
        const [reserved] = await tx
          .select({
            quantity: sql<string>`coalesce(sum(${stockReservationLines.reservedBaseQuantity}-${stockReservationLines.fulfilledBaseQuantity}-${stockReservationLines.releasedBaseQuantity}),0)`,
          })
          .from(stockReservationLines)
          .innerJoin(
            stockReservations,
            eq(stockReservationLines.reservationId, stockReservations.id),
          )
          .where(
            and(
              eq(stockReservationLines.companyId, companyId),
              eq(stockReservationLines.variantId, orderLine.variantId),
              eq(stockReservationLines.warehouseId, line.warehouseId),
              eq(stockReservations.status, "ACTIVE"),
            ),
          );
        if (
          FixedDecimal.parse(line.baseQuantity).compare(
            FixedDecimal.parse(balance?.quantity ?? "0").subtract(
              FixedDecimal.parse(reserved?.quantity ?? "0"),
            ),
          ) > 0
        )
          throw new BadRequestException({
            code: "INSUFFICIENT_AVAILABLE_STOCK",
            message: "Reservation exceeds available-to-sell stock",
          });
        await tx.insert(stockReservationLines).values({
          companyId,
          reservationId: header.id,
          salesOrderLineId: orderLine.id,
          variantId: orderLine.variantId,
          warehouseId: line.warehouseId,
          reservedBaseQuantity: line.baseQuantity,
          createdBy: actorId,
          updatedBy: actorId,
        });
        await tx
          .update(salesOrderLines)
          .set({
            reservedBaseQuantity: sql`${salesOrderLines.reservedBaseQuantity}+${line.baseQuantity}`,
            updatedBy: actorId,
          })
          .where(eq(salesOrderLines.id, orderLine.id));
      }
      return header;
    });
  }
  listDeliveries(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(deliveryChallans)
        .where(
          and(
            eq(deliveryChallans.companyId, companyId),
            q.cursor ? gt(deliveryChallans.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(deliveryChallans.id))
        .limit(q.limit),
    );
  }
  postDelivery(companyId: string, actorId: string, input: DeliveryInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [order] = await tx
        .select()
        .from(salesOrders)
        .where(and(eq(salesOrders.companyId, companyId), eq(salesOrders.id, input.salesOrderId)))
        .limit(1);
      if (order?.status !== "APPROVED")
        throw new BadRequestException({
          code: "INVALID_WORKFLOW_STATE",
          message: "Approved order required",
        });
      const [header] = await tx
        .insert(deliveryChallans)
        .values({
          companyId,
          salesOrderId: order.id,
          customerId: order.customerId,
          referenceNumber: input.referenceNumber,
          businessDate: input.dispatchDate,
          status: "DISPATCHED",
          postedAt: new Date(),
          postedBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!header) throw new Error("Delivery insert failed");
      const movementLines = [];
      for (const line of input.lines) {
        const [ol] = await tx
          .select()
          .from(salesOrderLines)
          .where(
            and(
              eq(salesOrderLines.companyId, companyId),
              eq(salesOrderLines.id, line.salesOrderLineId),
              eq(salesOrderLines.salesOrderId, order.id),
            ),
          )
          .limit(1);
        if (!ol) this.notFound("Sales order line");
        const base = FixedDecimal.parse(line.packageQuantity).multiply(
          FixedDecimal.parse(ol.conversionSnapshot),
        );
        if (
          base.compare(
            FixedDecimal.parse(ol.baseQuantity).subtract(
              FixedDecimal.parse(ol.dispatchedBaseQuantity),
            ),
          ) > 0
        )
          throw new BadRequestException({
            code: "DISPATCH_EXCEEDS_ORDER",
            message: "Dispatch exceeds pending quantity",
          });
        const [dl] = await tx
          .insert(deliveryChallanLines)
          .values({
            companyId,
            deliveryChallanId: header.id,
            salesOrderLineId: ol.id,
            variantId: ol.variantId,
            packagingLevelId: ol.packagingLevelId,
            warehouseId: line.warehouseId,
            locationId: line.locationId,
            packageQuantity: line.packageQuantity,
            conversionSnapshot: ol.conversionSnapshot,
            baseQuantity: base.toString(),
            createdBy: actorId,
            updatedBy: actorId,
          })
          .returning();
        if (!dl) throw new Error("Delivery line insert failed");
        movementLines.push({
          variantId: ol.variantId,
          packagingLevelId: ol.packagingLevelId ?? undefined,
          packageQuantity: line.packageQuantity,
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          serialNumbers: line.serialNumbers,
          conversionSnapshot: ol.conversionSnapshot,
        });
        await tx
          .update(salesOrderLines)
          .set({
            dispatchedBaseQuantity: sql`${salesOrderLines.dispatchedBaseQuantity}+${base.toString()}`,
            reservedBaseQuantity: sql`greatest(0,${salesOrderLines.reservedBaseQuantity}-${base.toString()})`,
            updatedBy: actorId,
          })
          .where(eq(salesOrderLines.id, ol.id));
      }
      const transactionId = await this.inventory.postSalesMovement(tx, companyId, actorId, {
        kind: "SALES_DISPATCH",
        referenceType: "DELIVERY_CHALLAN",
        referenceId: header.id,
        referenceNumber: header.referenceNumber,
        businessDate: header.businessDate,
        lines: movementLines,
      });
      await tx
        .update(deliveryChallans)
        .set({ inventoryTransactionId: transactionId })
        .where(eq(deliveryChallans.id, header.id));
      return { ...header, inventoryTransactionId: transactionId };
    });
  }
  listInvoices(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.companyId, companyId),
            q.cursor ? gt(salesInvoices.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(salesInvoices.id))
        .limit(q.limit),
    );
  }
  createInvoice(companyId: string, actorId: string, input: SalesInvoiceInput) {
    return this.database.withTenant(companyId, async (tx) => {
      await this.requireCustomer(tx, companyId, input.customerId);
      if (input.immediateDelivery && !input.salesOrderId)
        throw new BadRequestException({
          code: "ORDER_REQUIRED",
          message: "Immediate delivery requires an approved sales order",
        });
      const totals = this.totals(input.lines);
      const [doc] = await tx
        .insert(salesInvoices)
        .values({
          companyId,
          customerId: input.customerId,
          salesOrderId: input.salesOrderId,
          deliveryChallanId: input.deliveryChallanId,
          referenceNumber: input.referenceNumber,
          businessDate: input.invoiceDate,
          currency: input.currency,
          invoiceTotal: totals.grandTotal,
          outstandingAmount: totals.grandTotal,
          immediateDelivery: input.immediateDelivery,
          status: "ISSUED",
          issuedAt: new Date(),
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!doc) throw new Error("Invoice insert failed");
      await tx.insert(salesInvoiceLines).values(
        input.lines.map((x) => ({
          ...this.lineValues(companyId, actorId, x),
          salesInvoiceId: doc.id,
          deliveryChallanLineId: x.deliveryChallanLineId,
          salesOrderLineId: null,
        })),
      );
      return doc;
    });
  }
  listReturns(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(salesReturns)
        .where(
          and(
            eq(salesReturns.companyId, companyId),
            q.cursor ? gt(salesReturns.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(salesReturns.id))
        .limit(q.limit),
    );
  }
  postReturn(companyId: string, actorId: string, input: SalesReturnInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const [delivery] = await tx
        .select()
        .from(deliveryChallans)
        .where(
          and(
            eq(deliveryChallans.companyId, companyId),
            eq(deliveryChallans.id, input.deliveryChallanId),
          ),
        )
        .limit(1);
      if (!delivery) this.notFound("Delivery");
      const [header] = await tx
        .insert(salesReturns)
        .values({
          companyId,
          customerId: input.customerId,
          salesInvoiceId: input.salesInvoiceId,
          deliveryChallanId: input.deliveryChallanId,
          referenceNumber: input.referenceNumber,
          businessDate: input.returnDate,
          reason: input.reason,
          condition: input.condition,
          status: "POSTED",
          postedAt: new Date(),
          postedBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!header) throw new Error("Return insert failed");
      const movementLines = [];
      for (const line of input.lines) {
        const [dl] = await tx
          .select()
          .from(deliveryChallanLines)
          .where(
            and(
              eq(deliveryChallanLines.companyId, companyId),
              eq(deliveryChallanLines.id, line.deliveryChallanLineId),
              eq(deliveryChallanLines.deliveryChallanId, delivery.id),
            ),
          )
          .limit(1);
        if (!dl) this.notFound("Delivery line");
        const base = FixedDecimal.parse(line.packageQuantity).multiply(
          FixedDecimal.parse(dl.conversionSnapshot),
        );
        const [prior] = await tx
          .select({ quantity: sql<string>`coalesce(sum(${salesReturnLines.baseQuantity}),0)` })
          .from(salesReturnLines)
          .where(
            and(
              eq(salesReturnLines.companyId, companyId),
              eq(salesReturnLines.deliveryChallanLineId, dl.id),
            ),
          );
        if (
          base.compare(
            FixedDecimal.parse(dl.baseQuantity).subtract(
              FixedDecimal.parse(prior?.quantity ?? "0"),
            ),
          ) > 0
        )
          throw new BadRequestException({
            code: "RETURN_EXCEEDS_DISPATCH",
            message: "Return exceeds dispatched quantity",
          });
        await tx.insert(salesReturnLines).values({
          companyId,
          salesReturnId: header.id,
          deliveryChallanLineId: dl.id,
          variantId: dl.variantId,
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          packageQuantity: line.packageQuantity,
          conversionSnapshot: dl.conversionSnapshot,
          baseQuantity: base.toString(),
          createdBy: actorId,
          updatedBy: actorId,
        });
        movementLines.push({
          variantId: dl.variantId,
          packagingLevelId: dl.packagingLevelId ?? undefined,
          packageQuantity: line.packageQuantity,
          warehouseId: line.warehouseId,
          locationId: line.locationId,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          serialNumbers: line.serialNumbers,
          conversionSnapshot: dl.conversionSnapshot,
        });
      }
      const transactionId = await this.inventory.postSalesMovement(tx, companyId, actorId, {
        kind: "SALES_RETURN",
        referenceType: "SALES_RETURN",
        referenceId: header.id,
        referenceNumber: header.referenceNumber,
        businessDate: header.businessDate,
        lines: movementLines,
      });
      await tx
        .update(salesReturns)
        .set({ inventoryTransactionId: transactionId })
        .where(eq(salesReturns.id, header.id));
      return { ...header, inventoryTransactionId: transactionId };
    });
  }
  listCreditNotes(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(creditNotes)
        .where(
          and(
            eq(creditNotes.companyId, companyId),
            q.cursor ? gt(creditNotes.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(creditNotes.id))
        .limit(q.limit),
    );
  }
  createCreditNote(companyId: string, actorId: string, input: CreditNoteInput) {
    return this.database.withTenant(
      companyId,
      async (tx) =>
        (
          await tx
            .insert(creditNotes)
            .values({
              companyId,
              customerId: input.customerId,
              salesInvoiceId: input.salesInvoiceId,
              salesReturnId: input.salesReturnId,
              referenceNumber: input.referenceNumber,
              businessDate: input.creditDate,
              currency: input.currency,
              totalAmount: input.amount,
              reason: input.reason,
              createdBy: actorId,
              updatedBy: actorId,
            })
            .returning()
        )[0],
    );
  }
  listPayments(companyId: string, q: List) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select()
        .from(customerPayments)
        .where(
          and(
            eq(customerPayments.companyId, companyId),
            q.cursor ? gt(customerPayments.id, q.cursor) : undefined,
          ),
        )
        .orderBy(asc(customerPayments.id))
        .limit(q.limit),
    );
  }
  recordPayment(companyId: string, actorId: string, input: CustomerPaymentInput) {
    return this.database.withTenant(companyId, async (tx) => {
      const total = input.allocations.reduce(
        (n, x) => n.add(FixedDecimal.parse(x.amount)),
        FixedDecimal.zero(),
      );
      if (total.compare(FixedDecimal.parse(input.amount)) > 0)
        throw new BadRequestException({
          code: "PAYMENT_OVER_ALLOCATION",
          message: "Allocations exceed payment",
        });
      for (const allocation of input.allocations) {
        const [invoice] = await tx
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.companyId, companyId),
              eq(salesInvoices.id, allocation.invoiceId),
              eq(salesInvoices.customerId, input.customerId),
            ),
          )
          .limit(1);
        if (
          !invoice ||
          FixedDecimal.parse(allocation.amount).compare(
            FixedDecimal.parse(invoice.outstandingAmount),
          ) > 0
        )
          throw new BadRequestException({
            code: "PAYMENT_OVER_ALLOCATION",
            message: "Allocation exceeds invoice outstanding",
          });
      }
      const [payment] = await tx
        .insert(customerPayments)
        .values({
          companyId,
          customerId: input.customerId,
          referenceNumber: input.referenceNumber,
          businessDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          currency: input.currency,
          amount: input.amount,
          paymentReference: input.paymentReference,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!payment) throw new Error("Payment insert failed");
      for (const allocation of input.allocations) {
        await tx.insert(customerPaymentAllocations).values({
          companyId,
          customerPaymentId: payment.id,
          salesInvoiceId: allocation.invoiceId,
          allocatedAmount: allocation.amount,
          createdBy: actorId,
          updatedBy: actorId,
        });
        await tx
          .update(salesInvoices)
          .set({ outstandingAmount: sql`${salesInvoices.outstandingAmount}-${allocation.amount}` })
          .where(
            and(eq(salesInvoices.companyId, companyId), eq(salesInvoices.id, allocation.invoiceId)),
          );
      }
      return payment;
    });
  }
  outstanding(companyId: string) {
    return this.database.withTenant(companyId, (tx) =>
      tx
        .select({
          customerId: salesInvoices.customerId,
          outstanding: sql<string>`sum(${salesInvoices.outstandingAmount})`,
        })
        .from(salesInvoices)
        .where(eq(salesInvoices.companyId, companyId))
        .groupBy(salesInvoices.customerId),
    );
  }
  private lineValues(
    companyId: string,
    actorId: string,
    x: {
      variantId: string;
      packagingLevelId?: string | undefined;
      warehouseId: string;
      packageQuantity: string;
      conversionSnapshot: string;
      packageUnitPrice: string;
      discountAmount: string;
      taxAmount: string;
    },
  ) {
    const base = FixedDecimal.parse(x.packageQuantity).multiply(
        FixedDecimal.parse(x.conversionSnapshot),
      ),
      total = FixedDecimal.parse(x.packageQuantity)
        .multiply(FixedDecimal.parse(x.packageUnitPrice))
        .subtract(FixedDecimal.parse(x.discountAmount))
        .add(FixedDecimal.parse(x.taxAmount));
    return {
      companyId,
      variantId: x.variantId,
      packagingLevelId: x.packagingLevelId,
      warehouseId: x.warehouseId,
      packageQuantity: x.packageQuantity,
      conversionSnapshot: x.conversionSnapshot,
      baseQuantity: base.toString(),
      packageUnitPrice: x.packageUnitPrice,
      discountAmount: x.discountAmount,
      taxAmount: x.taxAmount,
      lineTotal: total.toString(),
      createdBy: actorId,
      updatedBy: actorId,
    };
  }
  private totals(
    lines: {
      packageQuantity: string;
      packageUnitPrice: string;
      discountAmount: string;
      taxAmount: string;
    }[],
  ) {
    let subtotal = FixedDecimal.zero(),
      discount = FixedDecimal.zero(),
      tax = FixedDecimal.zero();
    for (const x of lines) {
      subtotal = subtotal.add(
        FixedDecimal.parse(x.packageQuantity).multiply(FixedDecimal.parse(x.packageUnitPrice)),
      );
      discount = discount.add(FixedDecimal.parse(x.discountAmount));
      tax = tax.add(FixedDecimal.parse(x.taxAmount));
    }
    return {
      subtotal: subtotal.toString(),
      discountTotal: discount.toString(),
      taxTotal: tax.toString(),
      grandTotal: subtotal.subtract(discount).add(tax).toString(),
    };
  }
  private async requireCustomer(tx: Tx, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(customers)
      .where(
        and(eq(customers.companyId, companyId), eq(customers.id, id), isNull(customers.archivedAt)),
      )
      .limit(1);
    if (!row) this.notFound("Customer");
    return row;
  }
  private notFound(name: string): never {
    throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `${name} not found` });
  }
}
