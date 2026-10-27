# Purchase and Supplier Module Implementation

Phase 4 adds company-scoped supplier masters, requisitions, purchase orders, approvals, physical goods receipts, supplier invoices and three-way matching, purchase returns, landed costs, and supplier payment allocations.

Purchase orders are intent documents and never change stock. A posted goods receipt invokes the existing inventory application posting command inside the same tenant transaction and appends a `PURCHASE_RECEIPT` transaction. A posted purchase return appends `PURCHASE_RETURN`; balances remain rebuildable projections. Purchase lines snapshot packaging level, entered quantity, conversion, base quantity, package price, discount, tax, and totals.

All 26 purchase tables use `company_id`, composite tenant references, exact numeric fields, indexes, and forced PostgreSQL RLS. Supplier bank records contain only a masked display value, encrypted payload, and key reference. Full bank details are excluded from list responses.

The frontend provides 20 protected purchase views under `/purchases`. API authorization remains server-side through active-company and permission guards. The exact platform attribution remains unchanged.

Known limitations: direct receipt is blocked; tolerance is zero; printable PDFs, attachments/object storage, live notifications, configurable approval matrices, accounting journals, valuation application, bank reconciliation, and production encryption-key integration are deferred. Docker/PostgreSQL was unavailable for a live migration and RLS substitution test.
