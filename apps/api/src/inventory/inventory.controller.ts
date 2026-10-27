import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  brandInputSchema,
  categoryInputSchema,
  inventoryListQuerySchema,
  openingStockInputSchema,
  packagingLevelInputSchema,
  productInputSchema,
  productVariantInputSchema,
  stockAdjustmentInputSchema,
  stockCountInputSchema,
  stockTransferInputSchema,
  unitOfMeasurementInputSchema,
  warehouseInputSchema,
  warehouseLocationInputSchema,
  type BrandInput,
  type CategoryInput,
  type OpeningStockInput,
  type PackagingLevelInput,
  type ProductInput,
  type ProductVariantInput,
  type StockAdjustmentInput,
  type StockCountInput,
  type StockTransferInput,
  type UnitOfMeasurementInput,
  type WarehouseInput,
  type WarehouseLocationInput,
} from "@erp/types";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import { requestMetadata, type AuthenticatedRequest } from "../auth/auth.types.js";
import { PermissionGuard } from "../authorization/permission.guard.js";
import { RequirePermissions } from "../authorization/require-permissions.decorator.js";
import { TenantContextGuard } from "../authorization/tenant-context.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { InventoryService } from "./inventory.service.js";

type ListQuery = { search?: string; cursor?: string; limit: number };
function tenantId(request: AuthenticatedRequest): string {
  if (!request.tenant)
    throw new ForbiddenException({
      code: "TENANT_CONTEXT_INVALID",
      message: "Tenant context is required",
    });
  return request.tenant.companyId;
}

@Controller()
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("units-of-measurement")
  @RequirePermissions("inventory.view")
  units(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.listUnits(tenantId(request), query);
  }
  @Post("units-of-measurement")
  @RequirePermissions("inventory.units.manage")
  createUnit(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(unitOfMeasurementInputSchema)) input: UnitOfMeasurementInput,
  ) {
    return this.inventory.createUnit(tenantId(request), request.auth.sub, input);
  }

  @Get("categories")
  @RequirePermissions("inventory.view")
  categories(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.listCategories(tenantId(request), query);
  }
  @Post("categories")
  @RequirePermissions("inventory.categories.manage")
  createCategory(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(categoryInputSchema)) input: CategoryInput,
  ) {
    return this.inventory.createCategory(tenantId(request), request.auth.sub, input);
  }

  @Get("brands")
  @RequirePermissions("inventory.view")
  brands(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.listBrands(tenantId(request), query);
  }
  @Post("brands")
  @RequirePermissions("inventory.categories.manage")
  createBrand(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(brandInputSchema)) input: BrandInput,
  ) {
    return this.inventory.createBrand(tenantId(request), request.auth.sub, input);
  }

  @Get("products")
  @RequirePermissions("inventory.view")
  products(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.listProducts(tenantId(request), query);
  }
  @Get("products/:productId")
  @RequirePermissions("inventory.view")
  product(@Req() request: AuthenticatedRequest, @Param("productId") productId: string) {
    return this.inventory.getProduct(tenantId(request), productId);
  }
  @Post("products")
  @RequirePermissions("inventory.products.manage")
  createProduct(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(productInputSchema)) input: ProductInput,
  ) {
    return this.inventory.createProduct(tenantId(request), request.auth.sub, input);
  }
  @Post("product-variants")
  @RequirePermissions("inventory.products.manage")
  createVariant(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(productVariantInputSchema)) input: ProductVariantInput,
  ) {
    return this.inventory.createVariant(tenantId(request), request.auth.sub, input);
  }
  @Get("variants/:variantId/packages")
  @RequirePermissions("inventory.view")
  packaging(@Req() request: AuthenticatedRequest, @Param("variantId") variantId: string) {
    return this.inventory.listPackaging(tenantId(request), variantId);
  }
  @Post("product-packaging-levels")
  @RequirePermissions("inventory.products.manage")
  createPackaging(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(packagingLevelInputSchema)) input: PackagingLevelInput,
  ) {
    return this.inventory.createPackaging(tenantId(request), request.auth.sub, input);
  }

  @Get("warehouses")
  @RequirePermissions("inventory.view")
  warehouses(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.listWarehouses(tenantId(request), query);
  }
  @Post("warehouses")
  @RequirePermissions("inventory.warehouses.manage")
  createWarehouse(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(warehouseInputSchema)) input: WarehouseInput,
  ) {
    return this.inventory.createWarehouse(tenantId(request), request.auth.sub, input);
  }
  @Get("warehouses/:warehouseId/locations")
  @RequirePermissions("inventory.view")
  locations(@Req() request: AuthenticatedRequest, @Param("warehouseId") warehouseId: string) {
    return this.inventory.listLocations(tenantId(request), warehouseId);
  }
  @Post("warehouse-locations")
  @RequirePermissions("inventory.warehouses.manage")
  createLocation(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(warehouseLocationInputSchema)) input: WarehouseLocationInput,
  ) {
    return this.inventory.createLocation(tenantId(request), request.auth.sub, input);
  }

  @Post("opening-stock/post")
  @RequirePermissions("inventory.opening.enter")
  openingStock(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(openingStockInputSchema)) input: OpeningStockInput,
  ) {
    return this.inventory.postOpeningStock(
      tenantId(request),
      request.auth.sub,
      input,
      requestMetadata(request),
    );
  }
  @Post("stock-adjustments/post")
  @RequirePermissions("inventory.adjustment.create", "inventory.adjustment.approve")
  adjustment(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(stockAdjustmentInputSchema)) input: StockAdjustmentInput,
  ) {
    return this.inventory.postAdjustment(
      tenantId(request),
      request.auth.sub,
      input,
      requestMetadata(request),
    );
  }
  @Post("stock-transfers/post")
  @RequirePermissions("inventory.transfer.create", "inventory.transfer.receive")
  transfer(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(stockTransferInputSchema)) input: StockTransferInput,
  ) {
    return this.inventory.postTransfer(
      tenantId(request),
      request.auth.sub,
      input,
      requestMetadata(request),
    );
  }
  @Post("stock-counts/post")
  @RequirePermissions("inventory.count.perform", "inventory.count.approve")
  count(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(stockCountInputSchema)) input: StockCountInput,
  ) {
    return this.inventory.postCount(
      tenantId(request),
      request.auth.sub,
      input,
      requestMetadata(request),
    );
  }

  @Get("stock/ledger")
  @RequirePermissions("inventory.ledger.view")
  ledger(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.ledger(tenantId(request), query);
  }
  @Get("stock/availability")
  @RequirePermissions("inventory.view")
  availability(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.availability(tenantId(request), query);
  }
  @Get("batches")
  @RequirePermissions("inventory.view")
  batchList(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.batches(tenantId(request), query);
  }
  @Get("serials")
  @RequirePermissions("inventory.view")
  serialList(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(inventoryListQuerySchema)) query: ListQuery,
  ) {
    return this.inventory.serials(tenantId(request), query);
  }

  @Get("stock/ledger/export")
  @RequirePermissions("inventory.export")
  @Header("content-type", "text/csv; charset=utf-8")
  @Header("content-disposition", "attachment; filename=internal-inventory-ledger.csv")
  async exportLedger(@Req() request: AuthenticatedRequest): Promise<string> {
    const rows = await this.inventory.ledger(tenantId(request), { limit: 100 });
    const header =
      "Designed and Developed by ABHIJIT KUMAR MISRA\nInternal inventory report - not a customer legal document\nType,Reference,Business Date,Variant,Warehouse,Base Quantity\n";
    return (
      header +
      rows
        .map((row) =>
          [
            row.type,
            row.referenceNumber,
            row.businessDate,
            row.variantId,
            row.warehouseId,
            row.baseQuantity,
          ]
            .map((value) => `"${value.replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n")
    );
  }
}
