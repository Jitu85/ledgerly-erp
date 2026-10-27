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
  customerAddressInputSchema,
  customerContactInputSchema,
  customerInputSchema,
  customerPaymentInputSchema,
  creditNoteInputSchema,
  deliveryInputSchema,
  inventoryListQuerySchema,
  priceListInputSchema,
  salesInvoiceInputSchema,
  salesOrderInputSchema,
  salesQuotationInputSchema,
  salesReturnInputSchema,
  stockReservationInputSchema,
  type CustomerAddressInput,
  type CustomerContactInput,
  type CustomerInput,
  type CustomerPaymentInput,
  type CreditNoteInput,
  type DeliveryInput,
  type PriceListInput,
  type SalesInvoiceInput,
  type SalesOrderInput,
  type SalesQuotationInput,
  type SalesReturnInput,
  type StockReservationInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SalesService } from "./sales.service.js";
type List = { search?: string; cursor?: string; limit: number };
const status = z.object({
  status: z.string().trim().min(2).max(30),
  reason: z.string().trim().max(1000).optional(),
});
const update = customerInputSchema.partial().extend({ active: z.boolean().optional() });
function company(r: AuthenticatedRequest) {
  if (!r.tenant)
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  return r.tenant.companyId;
}
@Controller("sales")
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Get("customers") @RequirePermissions("sales.customers.view") customers(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listCustomers(company(r), q);
  }
  @Get("customers/:id") @RequirePermissions("sales.customers.view") customer(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.sales.getCustomer(company(r), id);
  }
  @Post("customers") @RequirePermissions("sales.customers.manage") createCustomer(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(customerInputSchema)) i: CustomerInput,
  ) {
    return this.sales.createCustomer(company(r), r.auth.sub, i);
  }
  @Patch("customers/:id") @RequirePermissions("sales.customers.manage") updateCustomer(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(update)) i: Partial<CustomerInput> & { active?: boolean },
  ) {
    return this.sales.updateCustomer(company(r), r.auth.sub, id, i);
  }
  @Delete("customers/:id") @RequirePermissions("sales.customers.manage") archiveCustomer(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.sales.archiveCustomer(company(r), r.auth.sub, id);
  }
  @Get("customers/:id/contacts") @RequirePermissions("sales.customers.view") contacts(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.sales.listContacts(company(r), id);
  }
  @Post("customers/:id/contacts") @RequirePermissions("sales.customers.manage") createContact(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(customerContactInputSchema)) i: CustomerContactInput,
  ) {
    return this.sales.createContact(company(r), r.auth.sub, id, i);
  }
  @Get("customers/:id/addresses") @RequirePermissions("sales.customers.view") addresses(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.sales.listAddresses(company(r), id);
  }
  @Post("customers/:id/addresses") @RequirePermissions("sales.customers.manage") createAddress(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(customerAddressInputSchema)) i: CustomerAddressInput,
  ) {
    return this.sales.createAddress(company(r), r.auth.sub, id, i);
  }
  @Get("price-lists") @RequirePermissions("sales.price-lists.view") priceLists(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listPriceLists(company(r), q);
  }
  @Post("price-lists") @RequirePermissions("sales.price-lists.manage") createPriceList(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(priceListInputSchema)) i: PriceListInput,
  ) {
    return this.sales.createPriceList(company(r), r.auth.sub, i);
  }
  @Get("quotations") @RequirePermissions("sales.quotations.view") quotations(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listQuotations(company(r), q);
  }
  @Post("quotations") @RequirePermissions("sales.quotations.create") createQuotation(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(salesQuotationInputSchema)) i: SalesQuotationInput,
  ) {
    return this.sales.createQuotation(company(r), r.auth.sub, i);
  }
  @Post("quotations/:id/action") @RequirePermissions("sales.quotations.approve") quotationAction(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(status)) i: z.infer<typeof status>,
  ) {
    return this.sales.quotationAction(company(r), r.auth.sub, id, i.status);
  }
  @Get("orders") @RequirePermissions("sales.orders.view") orders(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listOrders(company(r), q);
  }
  @Post("orders") @RequirePermissions("sales.orders.create") createOrder(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(salesOrderInputSchema)) i: SalesOrderInput,
  ) {
    return this.sales.createOrder(company(r), r.auth.sub, i);
  }
  @Post("orders/:id/action") @RequirePermissions("sales.orders.approve") orderAction(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(status)) i: z.infer<typeof status>,
  ) {
    return this.sales.orderAction(company(r), r.auth.sub, id, i.status, i.reason);
  }
  @Get("reservations") @RequirePermissions("sales.reservations.manage") reservations(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listReservations(company(r), q);
  }
  @Post("reservations") @RequirePermissions("sales.reservations.manage") reserve(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(stockReservationInputSchema)) i: StockReservationInput,
  ) {
    return this.sales.reserve(company(r), r.auth.sub, i);
  }
  @Get("deliveries") @RequirePermissions("sales.deliveries.view") deliveries(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listDeliveries(company(r), q);
  }
  @Post("deliveries/post")
  @RequirePermissions("sales.deliveries.create", "sales.dispatch.approve")
  delivery(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(deliveryInputSchema)) i: DeliveryInput,
  ) {
    return this.sales.postDelivery(company(r), r.auth.sub, i);
  }
  @Get("invoices") @RequirePermissions("sales.invoices.view") invoices(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listInvoices(company(r), q);
  }
  @Post("invoices") @RequirePermissions("sales.invoices.create") invoice(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(salesInvoiceInputSchema)) i: SalesInvoiceInput,
  ) {
    return this.sales.createInvoice(company(r), r.auth.sub, i);
  }
  @Get("returns") @RequirePermissions("sales.returns.view") returns(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listReturns(company(r), q);
  }
  @Post("returns/post")
  @RequirePermissions("sales.returns.create", "sales.returns.approve")
  salesReturn(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(salesReturnInputSchema)) i: SalesReturnInput,
  ) {
    return this.sales.postReturn(company(r), r.auth.sub, i);
  }
  @Get("credit-notes") @RequirePermissions("sales.credit-notes.view") creditNotes(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listCreditNotes(company(r), q);
  }
  @Post("credit-notes") @RequirePermissions("sales.credit-notes.create") creditNote(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(creditNoteInputSchema)) i: CreditNoteInput,
  ) {
    return this.sales.createCreditNote(company(r), r.auth.sub, i);
  }
  @Get("payments") @RequirePermissions("sales.payments.record") payments(
    @Req() r: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) q: List,
  ) {
    return this.sales.listPayments(company(r), q);
  }
  @Post("payments") @RequirePermissions("sales.payments.record") payment(
    @Req() r: AuthenticatedRequest,
    @Body(new ZodValidationPipe(customerPaymentInputSchema)) i: CustomerPaymentInput,
  ) {
    return this.sales.recordPayment(company(r), r.auth.sub, i);
  }
  @Get("outstanding") @RequirePermissions("sales.outstanding.view") outstanding(
    @Req() r: AuthenticatedRequest,
  ) {
    return this.sales.outstanding(company(r));
  }
}
