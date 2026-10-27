import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  purchaseRequisitionInputSchema,
  supplierAddressInputSchema,
  supplierContactInputSchema,
} from "@erp/types";
import { REQUIRED_PERMISSIONS } from "../authorization/require-permissions.decorator.js";
import { PurchaseController } from "./purchase.controller.js";
const uuid = "00000000-0000-4000-8000-000000000001";
function permissions(method: keyof PurchaseController): string[] {
  return Reflect.getMetadata(
    REQUIRED_PERMISSIONS,
    PurchaseController.prototype[method],
  ) as string[];
}
describe("purchase API contracts", () => {
  it("requires supplier-manage permission for contact and address writes", () => {
    expect(permissions("createContact")).toEqual(["purchase.suppliers.manage"]);
    expect(permissions("updateAddress")).toEqual(["purchase.suppliers.manage"]);
  });
  it("separates requisition creation and approval permissions", () => {
    expect(permissions("createRequisition")).toEqual(["purchase.requisitions.create"]);
    expect(permissions("decideRequisition")).toEqual(["purchase.requisitions.approve"]);
    expect(permissions("convertRequisition")).toEqual(["purchase.orders.create"]);
  });
  it("validates supplier contacts", () => {
    expect(
      supplierContactInputSchema.safeParse({
        name: "Procurement Desk",
        email: "buy@example.com",
        primary: true,
      }).success,
    ).toBe(true);
    expect(supplierContactInputSchema.safeParse({ name: "", email: "bad" }).success).toBe(false);
  });
  it("validates structured supplier addresses", () => {
    expect(
      supplierAddressInputSchema.safeParse({
        addressType: "PICKUP",
        line1: "1 Market Road",
        city: "Pune",
        countryCode: "in",
        primary: false,
      }).success,
    ).toBe(true);
    expect(
      supplierAddressInputSchema.safeParse({
        addressType: "UNKNOWN",
        line1: "",
        city: "",
        countryCode: "IND",
      }).success,
    ).toBe(false);
  });
  it("normalizes requisition quantities at a validated boundary", () => {
    const result = purchaseRequisitionInputSchema.safeParse({
      referenceNumber: "PR-1",
      businessDate: "2026-06-28",
      warehouseId: uuid,
      lines: [{ variantId: uuid, packageQuantity: "3", conversionSnapshot: "120" }],
    });
    expect(result.success).toBe(true);
    expect(
      purchaseRequisitionInputSchema.safeParse({
        referenceNumber: "PR-2",
        businessDate: "2026-06-28",
        warehouseId: uuid,
        lines: [],
      }).success,
    ).toBe(false);
  });
});
