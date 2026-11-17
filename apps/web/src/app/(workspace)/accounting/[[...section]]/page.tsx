import type { Metadata } from "next";
import { AccountingScreen } from "@/components/accounting/accounting-screen";

export const metadata: Metadata = {
  title: "Accounting",
  description:
    "Core double-entry accounting, General Ledger, Chart of Accounts, and Trial Balance.",
};

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <AccountingScreen currentSection={section[0] ?? "overview"} />;
}
