# Customer and Sales Module Implementation

Phase 5 adds company-scoped customers, contacts, addresses, categories, effective-dated price lists, quotations, sales orders, stock reservations, delivery challans, sales invoices, sales returns, credit notes, customer payments, and allocations.

Quotations and sales orders are commercial intent records and never alter physical stock. Reservations reduce available-to-sell quantity only. Dispatch invokes the existing inventory application posting command in the same tenant transaction and appends `SALES_DISPATCH`; accepted returns append `SALES_RETURN`. Both preserve package conversion snapshots, warehouse/location and batch/serial data. Physical balances remain rebuildable inventory projections.

All 28 sales tables contain `company_id`; migration constraints use composite tenant references, exact numeric fields, search indexes, forced PostgreSQL RLS, and immutable approval/allocation/tracking triggers. API routes use access-token, active-company and permission guards; request payloads never establish tenant authority.

The frontend provides 23 protected Sales views under `/sales`, using the existing responsive navy/teal shell and exact platform attribution.

Known limitations: PDF binary rendering, attachments/object storage, notifications, configurable policy matrices, accounting journals, refund processing, bank reconciliation, tax filing, POS, e-commerce and full reporting are deferred. Immediate-delivery invoices require an approved order; tracked immediate delivery should use the explicit delivery flow. Live PostgreSQL migration/RLS substitution remains a required environment gate.
