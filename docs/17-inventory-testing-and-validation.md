# Inventory Testing and Validation

Automated domain tests cover 120-piece carton conversion, 360-piece opening stock, 12-piece decrease, linked transfer pairs, tenant isolation, circular packaging, base-unit locking, batch requirements, duplicate serials, authorization, negative stock, and historic conversion snapshots.

Schema tests verify all requested tables, forced RLS SQL, immutable ledger triggers, and identity/conversion protection triggers. Migration application and live RLS substitution tests require PostgreSQL/Docker and must pass before production.
