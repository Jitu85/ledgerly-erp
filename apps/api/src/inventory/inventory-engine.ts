import { FixedDecimal } from "./decimal.js";

export type InventoryActor = {
  companyId: string;
  userId: string;
  permissions: ReadonlySet<string>;
};
export type VariantTracking = "NONE" | "BATCH" | "SERIAL";
type Variant = {
  id: string;
  companyId: string;
  baseUnitId: string;
  tracking: VariantTracking;
  expiryTracking: boolean;
};
type Packaging = {
  id: string;
  companyId: string;
  variantId: string;
  parentId: string | undefined;
  factor: FixedDecimal;
  active: boolean;
  version: number;
};
export type LedgerEntry = {
  id: string;
  companyId: string;
  type: string;
  variantId: string;
  warehouseId: string;
  quantityBase: string;
  conversionSnapshot: string;
  packageId?: string;
  batchNumber?: string;
  serialNumber?: string;
  linkedEntryId?: string;
};
type MovementInput = {
  variantId: string;
  packageId?: string;
  quantity: string;
  warehouseId: string;
  batchNumber?: string;
  serialNumbers?: string[];
};

function requirePermission(actor: InventoryActor, permission: string): void {
  if (!actor.permissions.has(permission)) throw new Error("PERMISSION_DENIED");
}

export class InventoryEngine {
  private readonly variants = new Map<string, Variant>();
  private readonly packages = new Map<string, Packaging>();
  private readonly ledgerEntries: LedgerEntry[] = [];
  private readonly balances = new Map<string, FixedDecimal>();
  private readonly serials = new Set<string>();
  private sequence = 0;

  addVariant(variant: Variant): void {
    this.variants.set(variant.id, { ...variant });
  }

  addPackaging(input: {
    id: string;
    companyId: string;
    variantId: string;
    parentId?: string;
    baseUnitEquivalent: string;
  }): void {
    const variant = this.tenantVariant(input.companyId, input.variantId);
    const factor = FixedDecimal.parse(input.baseUnitEquivalent);
    if (!factor.isPositive()) throw new Error("INVALID_CONVERSION");
    if (input.parentId) {
      const parent = this.tenantPackage(input.companyId, input.parentId);
      if (parent.variantId !== variant.id) throw new Error("PACKAGING_VARIANT_MISMATCH");
    }
    this.packages.set(input.id, {
      ...input,
      parentId: input.parentId,
      factor,
      active: true,
      version: 1,
    });
    this.assertNoCycle(input.id);
  }

  setPackagingParent(companyId: string, packageId: string, parentId?: string): void {
    const item = this.tenantPackage(companyId, packageId);
    if (parentId) {
      const parent = this.tenantPackage(companyId, parentId);
      if (parent.variantId !== item.variantId) throw new Error("PACKAGING_VARIANT_MISMATCH");
    }
    const previous = item.parentId;
    item.parentId = parentId;
    try {
      this.assertNoCycle(item.id);
    } catch (error) {
      item.parentId = previous;
      throw error;
    }
  }

  versionPackaging(
    companyId: string,
    packageId: string,
    newId: string,
    baseUnitEquivalent: string,
  ): void {
    const current = this.tenantPackage(companyId, packageId);
    current.active = false;
    this.addPackaging({
      id: newId,
      companyId,
      variantId: current.variantId,
      ...(current.parentId ? { parentId: current.parentId } : {}),
      baseUnitEquivalent,
    });
    const next = this.packages.get(newId);
    if (next) next.version = current.version + 1;
  }

  changeBaseUnit(companyId: string, variantId: string, nextBaseUnitId: string): void {
    const variant = this.tenantVariant(companyId, variantId);
    if (
      this.ledgerEntries.some(
        (entry) => entry.companyId === companyId && entry.variantId === variantId,
      )
    )
      throw new Error("BASE_UNIT_LOCKED");
    variant.baseUnitId = nextBaseUnitId;
  }

  postOpeningStock(actor: InventoryActor, input: MovementInput): LedgerEntry[] {
    requirePermission(actor, "inventory.opening.enter");
    return this.post(actor, "OPENING_STOCK", input, false);
  }

  postAdjustment(
    actor: InventoryActor,
    direction: "INCREASE" | "DECREASE",
    input: MovementInput,
  ): LedgerEntry[] {
    requirePermission(actor, "inventory.adjustment.create");
    return this.post(
      actor,
      direction === "INCREASE" ? "ADJUSTMENT_INCREASE" : "ADJUSTMENT_DECREASE",
      input,
      direction === "DECREASE",
    );
  }

  approveAdjustment(actor: InventoryActor): void {
    requirePermission(actor, "inventory.adjustment.approve");
  }

  transfer(
    actor: InventoryActor,
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    input: Omit<MovementInput, "warehouseId">,
  ): LedgerEntry[] {
    requirePermission(actor, "inventory.transfer.create");
    if (sourceWarehouseId === destinationWarehouseId) throw new Error("TRANSFER_WAREHOUSE_SAME");
    const out = this.post(
      actor,
      "TRANSFER_OUT",
      { ...input, warehouseId: sourceWarehouseId },
      true,
    );
    const incoming = this.post(
      actor,
      "TRANSFER_IN",
      { ...input, warehouseId: destinationWarehouseId },
      false,
    );
    const linked = incoming[0];
    if (linked) for (const entry of out) entry.linkedEntryId = linked.id;
    const firstOut = out[0];
    if (firstOut) for (const entry of incoming) entry.linkedEntryId = firstOut.id;
    return [...out, ...incoming];
  }

  ledger(companyId: string): readonly LedgerEntry[] {
    return this.ledgerEntries
      .filter((entry) => entry.companyId === companyId)
      .map((entry) => ({ ...entry }));
  }
  available(companyId: string, variantId: string, warehouseId: string): string {
    this.tenantVariant(companyId, variantId);
    return (
      this.balances.get(this.balanceKey(companyId, variantId, warehouseId)) ?? FixedDecimal.zero()
    ).toString();
  }

  private post(
    actor: InventoryActor,
    type: string,
    input: MovementInput,
    negative: boolean,
  ): LedgerEntry[] {
    const variant = this.tenantVariant(actor.companyId, input.variantId);
    const factor = input.packageId
      ? this.tenantPackage(actor.companyId, input.packageId).factor
      : FixedDecimal.parse("1");
    let base = FixedDecimal.parse(input.quantity).multiply(factor);
    if (!base.isPositive()) throw new Error("INVALID_QUANTITY");
    if (variant.tracking === "BATCH" && !input.batchNumber) throw new Error("BATCH_REQUIRED");
    if (variant.expiryTracking && !input.batchNumber) throw new Error("BATCH_REQUIRED");
    const serialNumbers = input.serialNumbers ?? [];
    if (variant.tracking === "SERIAL") {
      if (base.toString().includes(".") || BigInt(base.toString()) !== BigInt(serialNumbers.length))
        throw new Error("SERIAL_COUNT_MISMATCH");
      for (const serial of serialNumbers) {
        const key = `${actor.companyId}:${variant.id}:${serial}`;
        if (!negative && this.serials.has(key)) throw new Error("DUPLICATE_SERIAL");
        if (negative && !this.serials.has(key)) throw new Error("SERIAL_NOT_AVAILABLE");
      }
    }
    if (negative) base = base.negate();
    const key = this.balanceKey(actor.companyId, variant.id, input.warehouseId);
    const next = (this.balances.get(key) ?? FixedDecimal.zero()).add(base);
    if (next.isNegative()) throw new Error("INSUFFICIENT_STOCK");
    this.balances.set(key, next);
    if (variant.tracking === "SERIAL")
      for (const serial of serialNumbers) {
        const serialKey = `${actor.companyId}:${variant.id}:${serial}`;
        if (negative) this.serials.delete(serialKey);
        else this.serials.add(serialKey);
      }
    const common = {
      companyId: actor.companyId,
      type,
      variantId: variant.id,
      warehouseId: input.warehouseId,
      conversionSnapshot: factor.toString(),
      ...(input.packageId ? { packageId: input.packageId } : {}),
      ...(input.batchNumber ? { batchNumber: input.batchNumber } : {}),
    };
    const entries =
      variant.tracking === "SERIAL"
        ? serialNumbers.map((serial) => ({
            id: this.nextId(),
            ...common,
            quantityBase: negative ? "-1" : "1",
            serialNumber: serial,
          }))
        : [{ id: this.nextId(), ...common, quantityBase: base.toString() }];
    this.ledgerEntries.push(...entries);
    return entries.map((entry) => ({ ...entry }));
  }

  private tenantVariant(companyId: string, variantId: string): Variant {
    const variant = this.variants.get(variantId);
    if (variant?.companyId !== companyId) throw new Error("RESOURCE_NOT_FOUND");
    return variant;
  }
  private tenantPackage(companyId: string, packageId: string): Packaging {
    const item = this.packages.get(packageId);
    if (item?.companyId !== companyId) throw new Error("RESOURCE_NOT_FOUND");
    return item;
  }
  private assertNoCycle(startId: string): void {
    const visited = new Set<string>();
    let current: string | undefined = startId;
    while (current) {
      if (visited.has(current)) throw new Error("CIRCULAR_PACKAGING");
      visited.add(current);
      current = this.packages.get(current)?.parentId;
    }
  }
  private balanceKey(companyId: string, variantId: string, warehouseId: string): string {
    return `${companyId}:${variantId}:${warehouseId}`;
  }
  private nextId(): string {
    this.sequence += 1;
    return `movement-${this.sequence.toString()}`;
  }
}
