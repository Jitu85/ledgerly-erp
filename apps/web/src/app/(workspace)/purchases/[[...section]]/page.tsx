import type { Metadata } from "next";
import { PurchaseScreen } from "@/components/purchase/purchase-screen";
export const metadata: Metadata = {
  title: "Purchases",
  description:
    "Tenant-safe supplier, purchase order, receipt, matching, return, landed-cost, and payment management.",
};
export default async function PurchasesPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <PurchaseScreen screenKey={section.join("/")} />;
}
