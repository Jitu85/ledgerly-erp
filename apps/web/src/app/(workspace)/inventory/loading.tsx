import { LoadingState } from "@erp/ui";

export default function InventoryLoading() {
  return (
    <section className="inventory-panel route-state">
      <LoadingState label="Loading inventory workspace" />
    </section>
  );
}
