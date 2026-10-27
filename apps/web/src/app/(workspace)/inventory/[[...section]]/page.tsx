import type { Metadata } from "next";
import { InventoryScreen } from "@/components/inventory/inventory-screen";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Tenant-safe product, packaging, warehouse, and immutable stock ledger management.",
};

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <InventoryScreen screenKey={section.join("/")} />;
}
