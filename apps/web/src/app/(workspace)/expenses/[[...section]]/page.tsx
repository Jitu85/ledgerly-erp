import type { Metadata } from "next";
import { ExpenseScreen } from "@/components/expenses/expense-screen";

export const metadata: Metadata = {
  title: "Expenses",
  description:
    "Employee expense claims, manager approvals, policy limits, and General Ledger posting.",
};

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <ExpenseScreen currentSection={section[0] ?? "overview"} />;
}
