import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  goodsReceiptInputSchema,
  inventoryListQuerySchema,
  landedCostInputSchema,
  purchaseInvoiceInputSchema,
  purchaseOrderInputSchema,
  purchaseRequisitionInputSchema,
  purchaseReturnInputSchema,
  supplierAddressInputSchema,
  supplierContactInputSchema,
  supplierInputSchema,
  supplierPaymentInputSchema,
  type GoodsReceiptInput,
  type LandedCostInput,
  type PurchaseInvoiceInput,
  type PurchaseOrderInput,
  type PurchaseRequisitionInput,
  type PurchaseReturnInput,
  type SupplierAddressInput,
  type SupplierContactInput,
  type SupplierInput,
  type SupplierPaymentInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { PurchaseService } from "./purchase.service.js";
type ListQuery = { search?: string; cursor?: string; limit: number };
const decision = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(1000).optional(),
});
const requisitionDecision = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "RETURNED"]),
  reason: z.string().trim().min(3).max(1000).optional(),
});
const supplierUpdate = supplierInputSchema.partial().extend({ active: z.boolean().optional() });
function company(req: AuthenticatedRequest) {
  if (!req.tenant)
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  return req.tenant.companyId;
}
@Controller("purchase")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}
  @Get("suppliers") @RequirePermissions("purchase.suppliers.view") listSuppliers(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: ListQuery,
  ) {
    return this.purchase.listSuppliers(company(r), q);
  }
  @Get("suppliers/:id") @RequirePermissions("purchase.suppliers.view") supplier(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.purchase.getSupplier(company(r), id);
  }
  @Post("suppliers") @RequirePermissions("purchase.suppliers.manage") createSupplier(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(supplierInputSchema)) input: SupplierInput,
  ) {
    return this.purchase.createSupplier(company(r), r.auth.sub, input);
  }
  @Patch("suppliers/:id") @RequirePermissions("purchase.suppliers.manage") updateSupplier(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(supplierUpdate))
    input: Partial<SupplierInput> & { active?: boolean },
  ) {
    return this.purchase.updateSupplier(company(r), r.auth.sub, id, input);
  }
  @Delete("suppliers/:id") @RequirePermissions("purchase.suppliers.manage") archiveSupplier(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.purchase.archiveSupplier(company(r), r.auth.sub, id);
  }
  @Get("suppliers/:supplierId/contacts")
  @RequirePermissions("purchase.suppliers.view")
  contacts(@Req() r: AuthenticatedRequest, @Param("supplierId") supplierId: string) {
    return this.purchase.listSupplierContacts(company(r), supplierId);
  }
  @Post("suppliers/:supplierId/contacts")
  @RequirePermissions("purchase.suppliers.manage")
  createContact(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Body(new ZodValidationPipe(supplierContactInputSchema)) input: SupplierContactInput,
  ) {
    return this.purchase.createSupplierContact(company(r), r.auth.sub, supplierId, input);
  }
  @Patch("suppliers/:supplierId/contacts/:id")
  @RequirePermissions("purchase.suppliers.manage")
  updateContact(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(supplierContactInputSchema.partial()))
    input: Partial<SupplierContactInput>,
  ) {
    return this.purchase.updateSupplierContact(company(r), r.auth.sub, supplierId, id, input);
  }
  @Delete("suppliers/:supplierId/contacts/:id")
  @RequirePermissions("purchase.suppliers.manage")
  archiveContact(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Param("id") id: string,
  ) {
    return this.purchase.archiveSupplierContact(company(r), r.auth.sub, supplierId, id);
  }
  @Get("suppliers/:supplierId/addresses")
  @RequirePermissions("purchase.suppliers.view")
  addresses(@Req() r: AuthenticatedRequest, @Param("supplierId") supplierId: string) {
    return this.purchase.listSupplierAddresses(company(r), supplierId);
  }
  @Post("suppliers/:supplierId/addresses")
  @RequirePermissions("purchase.suppliers.manage")
  createAddress(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Body(new ZodValidationPipe(supplierAddressInputSchema)) input: SupplierAddressInput,
  ) {
    return this.purchase.createSupplierAddress(company(r), r.auth.sub, supplierId, input);
  }
  @Patch("suppliers/:supplierId/addresses/:id")
  @RequirePermissions("purchase.suppliers.manage")
  updateAddress(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(supplierAddressInputSchema.partial()))
    input: Partial<SupplierAddressInput>,
  ) {
    return this.purchase.updateSupplierAddress(company(r), r.auth.sub, supplierId, id, input);
  }
  @Delete("suppliers/:supplierId/addresses/:id")
  @RequirePermissions("purchase.suppliers.manage")
  archiveAddress(
    @Req() r: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Param("id") id: string,
  ) {
    return this.purchase.archiveSupplierAddress(company(r), r.auth.sub, supplierId, id);
  }
  @Get("requisitions")
  @RequirePermissions("purchase.requisitions.view")
  requisitions(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: ListQuery,
  ) {
    return this.purchase.listRequisitions(company(r), q);
  }
  @Get("requisitions/:id")
  @RequirePermissions("purchase.requisitions.view")
  requisition(@Req() r: AuthenticatedRequest, @Param("id") id: string) {
    return this.purchase.getRequisition(company(r), id);
  }
  @Post("requisitions")
  @RequirePermissions("purchase.requisitions.create")
  createRequisition(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(purchaseRequisitionInputSchema)) input: PurchaseRequisitionInput,
  ) {
    return this.purchase.createRequisition(company(r), r.auth.sub, input);
  }
  @Patch("requisitions/:id")
  @RequirePermissions("purchase.requisitions.create")
  updateRequisition(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(purchaseRequisitionInputSchema)) input: PurchaseRequisitionInput,
  ) {
    return this.purchase.updateRequisition(company(r), r.auth.sub, id, input);
  }
  @Post("requisitions/:id/submit")
  @RequirePermissions("purchase.requisitions.create")
  submitRequisition(@Req() r: AuthenticatedRequest, @Param("id") id: string) {
    return this.purchase.submitRequisition(company(r), r.auth.sub, id);
  }
  @Post("requisitions/:id/decision")
  @RequirePermissions("purchase.requisitions.approve")
  decideRequisition(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(requisitionDecision)) input: z.infer<typeof requisitionDecision>,
  ) {
    return this.purchase.decideRequisition(
      company(r),
      r.auth.sub,
      id,
      input.decision,
      input.reason,
    );
  }
  @Post("requisitions/:id/cancel")
  @RequirePermissions("purchase.requisitions.create")
  cancelRequisition(@Req() r: AuthenticatedRequest, @Param("id") id: string) {
    return this.purchase.cancelRequisition(company(r), r.auth.sub, id);
  }
  @Post("requisitions/:id/convert-to-order")
  @RequirePermissions("purchase.orders.create")
  convertRequisition(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(purchaseOrderInputSchema)) input: PurchaseOrderInput,
  ) {
    if (input.requisitionId !== id)
      throw new ForbiddenException({
        code: "REQUISITION_CONTEXT_INVALID",
        message: "Requisition context is invalid",
      });
    return this.purchase.createOrder(company(r), r.auth.sub, input);
  }
  @Get("orders") @RequirePermissions("purchase.orders.view") orders(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: ListQuery,
  ) {
    return this.purchase.listOrders(company(r), q);
  }
  @Post("orders") @RequirePermissions("purchase.orders.create") createOrder(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(purchaseOrderInputSchema)) input: PurchaseOrderInput,
  ) {
    return this.purchase.createOrder(company(r), r.auth.sub, input);
  }
  @Post("orders/:id/submit") @RequirePermissions("purchase.orders.create") submit(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.purchase.submitOrder(company(r), r.auth.sub, id);
  }
  @Post("orders/:id/decision") @RequirePermissions("purchase.orders.approve") decide(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(decision)) input: z.infer<typeof decision>,
  ) {
    return this.purchase.approveOrder(company(r), r.auth.sub, id, input.decision, input.reason);
  }
  @Post("orders/:id/cancel") @RequirePermissions("purchase.orders.cancel") cancel(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.purchase.cancelOrder(company(r), r.auth.sub, id);
  }
  @Post("goods-receipts/post")
  @RequirePermissions("purchase.receipts.create", "purchase.receipts.approve")
  receipt(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(goodsReceiptInputSchema)) input: GoodsReceiptInput,
  ) {
    return this.purchase.postReceipt(company(r), r.auth.sub, input);
  }
  @Post("invoices") @RequirePermissions("purchase.invoices.create") invoice(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(purchaseInvoiceInputSchema)) input: PurchaseInvoiceInput,
  ) {
    return this.purchase.createInvoice(company(r), r.auth.sub, input);
  }
  @Post("returns/post")
  @RequirePermissions("purchase.returns.create", "purchase.returns.approve")
  purchaseReturn(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(purchaseReturnInputSchema)) input: PurchaseReturnInput,
  ) {
    return this.purchase.postReturn(company(r), r.auth.sub, input);
  }
  @Post("landed-costs") @RequirePermissions("purchase.landed-costs.manage") landed(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(landedCostInputSchema)) input: LandedCostInput,
  ) {
    return this.purchase.createLandedCost(company(r), r.auth.sub, input);
  }
  @Post("payments") @RequirePermissions("purchase.payments.record") payment(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(supplierPaymentInputSchema)) input: SupplierPaymentInput,
  ) {
    return this.purchase.recordPayment(company(r), r.auth.sub, input);
  }
}
