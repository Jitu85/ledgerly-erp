# Inventory API Reference

All routes are under `/api/v1`, require access-token, active-company, and permission guards, and never accept `company_id` as authority.

Masters: `GET/POST /units-of-measurement`, `/categories`, `/brands`, `/products`, `/product-variants`, `/product-packaging-levels`, `/warehouses`, and `/warehouse-locations`.

Posting: `POST /opening-stock/post`, `/stock-adjustments/post`, `/stock-transfers/post`, and `/stock-counts/post`.

Queries: `GET /stock/ledger`, `/stock/availability`, `/batches`, and `/serials`. `GET /stock/ledger/export` requires `inventory.export` and generates a branded internal CSV.

Errors include `RESOURCE_NOT_FOUND`, `PERMISSION_DENIED`, `TRACKING_DATA_REQUIRED`, `DUPLICATE_SERIAL`, and `INSUFFICIENT_STOCK` without cross-tenant disclosure.
