import { LoadingState } from "@erp/ui";
export default function PurchasesLoading() {
  return (
    <section className="inventory-panel route-state">
      <LoadingState label="Loading purchase workspace" />
    </section>
  );
}
