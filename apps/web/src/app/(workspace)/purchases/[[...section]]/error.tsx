"use client";
import { ErrorState } from "@erp/ui";
export default function PurchasesError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Purchases could not be loaded"
      description="The company-scoped purchase request failed safely."
      retry={reset}
    />
  );
}
