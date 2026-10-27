import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import {
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
} from "./inventory-schema.js";

const inventoryTables = [
  productCategories,
  brands,
  unitsOfMeasurement,
  products,
  productVariants,
  productPackagingLevels,
  productBarcodes,
  warehouses,
  warehouseLocations,
  inventoryTransactions,
  inventoryTransactionLines,
  inventoryBalanceProjections,
  stockBatches,
  serialNumbers,
  stockAdjustments,
  stockAdjustmentLines,
  stockTransfers,
  stockTransferLines,
  stockCounts,
  stockCountLines,
];

describe("inventory schema", () => {
  it("contains every required Phase 3 inventory table", () => {
    expect(inventoryTables.map(getTableName)).toEqual([
      "product_categories",
      "brands",
      "units_of_measurement",
      "products",
      "product_variants",
      "product_packaging_levels",
      "product_barcodes",
      "warehouses",
      "warehouse_locations",
      "inventory_transactions",
      "inventory_transaction_lines",
      "inventory_balance_projections",
      "stock_batches",
      "serial_numbers",
      "stock_adjustments",
      "stock_adjustment_lines",
      "stock_transfers",
      "stock_transfer_lines",
      "stock_counts",
      "stock_count_lines",
    ]);
  });

  it("migration forces RLS and protects immutable stock history", () => {
    const migration = readFileSync(
      new URL("../migrations/0001_inventory_engine.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("inventory_transactions_immutable");
    expect(migration).toContain("inventory_transaction_lines_immutable");
    expect(migration).toContain("product_variants_protect_base_unit");
    expect(migration).toContain("product_packaging_levels_protect_history");
  });
});
