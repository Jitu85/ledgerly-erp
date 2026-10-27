"use client";

import { ErrorState } from "@erp/ui";

export default function InventoryError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Inventory could not be loaded"
      description="The company-scoped inventory request failed safely."
      retry={reset}
    />
  );
}
