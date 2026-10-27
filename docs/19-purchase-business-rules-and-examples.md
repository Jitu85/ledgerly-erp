# Purchase Business Rules and Examples

## Lifecycle

Suppliers begin inactive and become selectable only after review. Requisitions are optional policy documents. Purchase orders move from draft to submitted and then approved or rejected. Approval has no stock effect.

A receipt requires an approved purchase order. Each accepted package quantity is multiplied by the purchase-line conversion snapshot. For 3 cartons where 1 carton = 10 boxes and 1 box = 12 pieces, the receipt posts `3 × 120 = 360` base pieces. Receiving 5 of 10 cartons leaves 600 base pieces pending. Batch and serial rules are delegated to the inventory engine.

Invoices compare ordered, net-received, and invoiced base quantities plus snapshotted package prices. Differences are marked `MISMATCH`; exception approval is separate. Historical order prices never follow later supplier-price changes.

Returns reference posted receipt lines, cannot exceed net received stock, preserve tracking dimensions, and post a negative immutable ledger entry. Landed costs preserve type, basis, allocated amount, and effective base-unit cost without posting accounting. Payment allocations cannot exceed the payment or invoice outstanding amount.

Default safety policy: direct receipts are disabled, receipt tolerance is zero, invoice-without-order is disabled, and negative stock is blocked. These remain open company-policy decisions.
