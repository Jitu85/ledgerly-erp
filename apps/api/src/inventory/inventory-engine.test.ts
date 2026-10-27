import { describe, expect, it } from "vitest";
import { FixedDecimal } from "./decimal.js";
import { InventoryEngine, type InventoryActor } from "./inventory-engine.js";

const companyA = "company-a";
const companyB = "company-b";
const allPermissions = new Set([
  "inventory.opening.enter",
  "inventory.adjustment.create",
  "inventory.adjustment.approve",
  "inventory.transfer.create",
]);
const actor = (companyId = companyA, permissions = allPermissions): InventoryActor => ({
  companyId,
  userId: `${companyId}-user`,
  permissions,
});

function basicEngine(): InventoryEngine {
  const engine = new InventoryEngine();
  engine.addVariant({
    id: "water",
    companyId: companyA,
    baseUnitId: "piece",
    tracking: "NONE",
    expiryTracking: false,
  });
  engine.addPackaging({
    id: "box",
    companyId: companyA,
    variantId: "water",
    baseUnitEquivalent: "12",
  });
  engine.addPackaging({
    id: "carton",
    companyId: companyA,
    variantId: "water",
    parentId: "box",
    baseUnitEquivalent: "120",
  });
  return engine;
}

describe("inventory and packaging engine", () => {
  it("calculates ten boxes of twelve pieces as 120 pieces", () => {
    expect(FixedDecimal.parse("10").multiply(FixedDecimal.parse("12")).toString()).toBe("120");
  });

  it("posts three cartons as 360 immutable base-unit pieces", () => {
    const engine = basicEngine();
    const entries = engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "carton",
      quantity: "3",
      warehouseId: "main",
    });
    expect(entries[0]).toMatchObject({
      quantityBase: "360",
      conversionSnapshot: "120",
      type: "OPENING_STOCK",
    });
    expect(engine.available(companyA, "water", "main")).toBe("360");
  });

  it("reduces available stock by twelve pieces for one box", () => {
    const engine = basicEngine();
    engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "carton",
      quantity: "3",
      warehouseId: "main",
    });
    engine.postAdjustment(actor(), "DECREASE", {
      variantId: "water",
      packageId: "box",
      quantity: "1",
      warehouseId: "main",
    });
    expect(engine.available(companyA, "water", "main")).toBe("348");
  });

  it("creates linked matching transfer-out and transfer-in records", () => {
    const engine = basicEngine();
    engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "carton",
      quantity: "2",
      warehouseId: "main",
    });
    const entries = engine.transfer(actor(), "main", "secondary", {
      variantId: "water",
      packageId: "carton",
      quantity: "1",
    });
    expect(entries.map((entry) => [entry.type, entry.quantityBase])).toEqual([
      ["TRANSFER_OUT", "-120"],
      ["TRANSFER_IN", "120"],
    ]);
    expect(entries[0]?.linkedEntryId).toBe(entries[1]?.id);
    expect(engine.available(companyA, "water", "main")).toBe("120");
    expect(engine.available(companyA, "water", "secondary")).toBe("120");
  });

  it("does not reveal another tenant's variant, stock, or ledger", () => {
    const engine = basicEngine();
    engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "box",
      quantity: "1",
      warehouseId: "main",
    });
    expect(engine.ledger(companyB)).toEqual([]);
    expect(() => engine.available(companyB, "water", "main")).toThrow("RESOURCE_NOT_FOUND");
    expect(() =>
      engine.postOpeningStock(actor(companyB), {
        variantId: "water",
        packageId: "box",
        quantity: "1",
        warehouseId: "main",
      }),
    ).toThrow("RESOURCE_NOT_FOUND");
  });

  it("rejects a circular packaging hierarchy", () => {
    const engine = basicEngine();
    expect(() => engine.setPackagingParent(companyA, "box", "carton")).toThrow(
      "CIRCULAR_PACKAGING",
    );
  });

  it("locks the base unit after the first stock movement", () => {
    const engine = basicEngine();
    engine.postOpeningStock(actor(), { variantId: "water", quantity: "1", warehouseId: "main" });
    expect(() => engine.changeBaseUnit(companyA, "water", "carton")).toThrow("BASE_UNIT_LOCKED");
  });

  it("requires a batch number for batch-tracked opening stock", () => {
    const engine = new InventoryEngine();
    engine.addVariant({
      id: "medicine",
      companyId: companyA,
      baseUnitId: "piece",
      tracking: "BATCH",
      expiryTracking: true,
    });
    expect(() =>
      engine.postOpeningStock(actor(), {
        variantId: "medicine",
        quantity: "5",
        warehouseId: "main",
      }),
    ).toThrow("BATCH_REQUIRED");
  });

  it("rejects duplicate serial numbers", () => {
    const engine = new InventoryEngine();
    engine.addVariant({
      id: "phone",
      companyId: companyA,
      baseUnitId: "piece",
      tracking: "SERIAL",
      expiryTracking: false,
    });
    engine.postOpeningStock(actor(), {
      variantId: "phone",
      quantity: "1",
      warehouseId: "main",
      serialNumbers: ["SN-001"],
    });
    expect(() =>
      engine.postOpeningStock(actor(), {
        variantId: "phone",
        quantity: "1",
        warehouseId: "main",
        serialNumbers: ["SN-001"],
      }),
    ).toThrow("DUPLICATE_SERIAL");
  });

  it("rejects unauthorized adjustment creation and approval", () => {
    const engine = basicEngine();
    const unauthorized = actor(companyA, new Set());
    expect(() =>
      engine.postAdjustment(unauthorized, "INCREASE", {
        variantId: "water",
        quantity: "1",
        warehouseId: "main",
      }),
    ).toThrow("PERMISSION_DENIED");
    expect(() => engine.approveAdjustment(unauthorized)).toThrow("PERMISSION_DENIED");
  });

  it("rejects negative stock by default", () => {
    const engine = basicEngine();
    expect(() =>
      engine.postAdjustment(actor(), "DECREASE", {
        variantId: "water",
        packageId: "box",
        quantity: "1",
        warehouseId: "main",
      }),
    ).toThrow("INSUFFICIENT_STOCK");
  });

  it("keeps ledger conversion snapshots unchanged after packaging versioning", () => {
    const engine = basicEngine();
    engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "box",
      quantity: "2",
      warehouseId: "main",
    });
    engine.versionPackaging(companyA, "box", "box-v2", "10");
    engine.postOpeningStock(actor(), {
      variantId: "water",
      packageId: "box-v2",
      quantity: "1",
      warehouseId: "main",
    });
    expect(engine.ledger(companyA).map((entry) => entry.conversionSnapshot)).toEqual(["12", "10"]);
  });
});
