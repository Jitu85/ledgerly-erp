# Purchase Testing and Validation

Domain tests cover the 15 required scenarios: supplier isolation; purchase-order zero stock effect; 360-piece carton conversion; partial receipt pending quantity; batch requirement; duplicate serial rejection; immutable receipt ledger view; return stock decrease; excessive return rejection; invoice mismatch; quantity-based landed-cost allocation; payment over-allocation; approval permission; historic price snapshot; and isolation across purchase aggregates.

Migration tests verify all 26 requested tables, forced RLS coverage, composite tenant references, exact numerics, encrypted/masked bank fields, and immutable approval/match/allocation triggers, and archival supplier subresources.

API contract tests verify contact/address validation and separate supplier, requisition-create, requisition-approval, and order-conversion permissions.

Strict TypeScript, formatting, lint, unit tests, API build, and web production build are completion gates. Live migration and role-substitution RLS tests require PostgreSQL. They were not treated as passed when Docker/PostgreSQL was unavailable.
