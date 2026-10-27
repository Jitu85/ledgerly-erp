import type { Metadata } from "next";
import { SalesScreen } from "@/components/sales/sales-screen";
export const metadata: Metadata = {
  title: "Sales",
  description:
    "Tenant-safe customer, quotation, reservation, dispatch, invoice, return and payment management.",
};
export default async function SalesPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  return <SalesScreen screenKey={section.join("/")} />;
}
