# Sales Testing and Validation

Domain tests cover the 17 required scenarios: customer isolation; quotation and order zero-stock effects; reservation availability; 240-piece carton reservation; 120-piece dispatch; partial fulfilment; batch requirement; serial reuse rejection; immediate-invoice idempotency; immutable return increase; excessive return rejection; credit-limit enforcement; payment over-allocation; approval permission; historical pricing; and isolation across sales aggregates.

Migration tests verify all 28 requested tables, forced RLS coverage, composite tenant references, exact numerics and immutable sales history triggers. Contract/type tests validate the customer and transaction boundaries.

Completion gates are formatting, lint, strict TypeScript, unit/integration tests, API build and web production build. Live migration, database-role RLS substitution, concurrency and authenticated browser workflows require a configured PostgreSQL environment and must not be reported as passed unless executed.
