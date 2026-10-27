# Open Business Decisions and Document Conflicts

## Purpose

This is the durable decision log for unresolved business policy, implementation assumptions, and conflicts between requirements. A proposal is not a final business decision until an authorized product or technical owner accepts it.

## Document Conflicts

### C-001 ï¿½ Foundational identity table names

- `docs/05-database-design.md` proposes `platform_users` and `company_memberships`.
- Phase 2 explicitly requires `users` and `company_users`.
- Implementation: use the Phase 2 names `users` and `company_users` because they are an explicit deliverable.
- Impact: documentation and later module designs must treat these names as aliases for the same global-identity and tenant-membership concepts unless a migration is approved.
- Status: Open; naming should be ratified before public API or analytics contracts depend on it.

### C-002 ï¿½ Managed OIDC versus first-party credential foundation

- `docs/06-system-architecture.md` recommends managed OIDC, and `docs/10-security-and-audit-policy.md` says to use a standards-based OIDC provider.
- Phase 2 requires password hashing, password-reset tokens, login lockout, sessions, and refresh-token rotation before an identity provider has been selected.
- Implementation: provide a narrowly scoped first-party email/password and opaque refresh-session foundation with Argon2id hashing and short-lived JWT access tokens. Keep authentication services replaceable and do not treat this as the final production identity-provider decision.
- Impact: production launch remains blocked until the OIDC/MFA provider and migration/linking strategy are approved.
- Status: Open.

### C-003 ï¿½ Phase name versus roadmap name

- The current request calls this work ï¿½Phase 2: ERP Engineering Foundation.ï¿½
- `docs/09-development-roadmap.md` calls equivalent work the ï¿½Foundation Releaseï¿½ after ï¿½Phase 0.ï¿½
- Implementation: treat the current request as the Foundation Release scope; do not renumber the existing roadmap.
- Impact: planning labels differ but the allowed implementation scope is aligned.
- Status: Accepted as a naming-only discrepancy unless roadmap numbering is later standardized.

## Proposed Technical Decisions Awaiting Ratification

1. Use a pnpm workspace monorepo with Turborepo task orchestration.
2. Use Next.js App Router for `apps/web` and NestJS with Fastify for `apps/api`.
3. Use PostgreSQL with Drizzle ORM and SQL migrations. Complex ledger/report queries remain explicit SQL.
4. Use Redis with BullMQ for queues; no business truth is stored in Redis.
5. Use S3-compatible object storage behind a provider interface; select the production vendor after region and compliance decisions.
6. Use short-lived JWT access tokens in secure HTTP-only cookies plus rotating opaque refresh tokens until managed OIDC is selected.
7. Use a shared database with `company_id` and PostgreSQL RLS initially; dedicated databases remain an enterprise option.
8. Deploy containerized web, API, and worker workloads to a managed container platform; the cloud and region are unresolved.

## Open Business Decisions

These decisions block dependent production behavior but do not block the foundation scaffold:

1. Launch countries, tax regimes, currencies, payroll jurisdiction, and legal-entity model.
2. Final managed OIDC provider, required MFA methods, session lifetimes, and account-linking migration from the foundation credential flow.
3. Whether every company has exactly one owner or supports co-owners.
4. Whether Company Admin may manage all roles or only delegable non-owner roles.
5. Support-access consent, expiry, masking, and break-glass requirements.
6. Subscription plans, trial behavior, usage limits, billing provider, grace period, and suspension read/export policy.
7. Production cloud, regions, data residency, availability, RPO, RTO, and recovery commitments.
8. Retention periods for sessions, login history, reset/verification tokens, audit events, closed companies, and backups.
9. Required compliance targets and fields needing field-level encryption or tokenization.
10. Expected tenant count, users per tenant, peak traffic, and audit-event volume for capacity tests.
11. Email delivery provider and the URL/domain strategy for verification, invitations, and password reset.
12. Whether UUIDv7 must be database-generated or application-generated.

## Foundation Assumptions

- A user identity is global and may have many active `company_users` memberships.
- A request has at most one active company context.
- Super Admin authority is platform-scoped and does not imply routine tenant business-data access.
- Registration creates a pending company and a protected Company Owner role/membership; production activation waits for verification and policy checks.
- Audit logs are append-only; sensitive values and raw authentication tokens are excluded.
- Platform-level tables do not receive a `company_id`; tenant-owned tables always do.

### C-004 - Inventory table naming

- Architecture documents use `units_of_measure`, `variant_packages`, and `stock_movements`; Phase 3 explicitly requires `units_of_measurement`, `product_packaging_levels`, and `inventory_transactions`.
- Implementation uses the Phase 3 names while preserving the documented concepts.
- Impact: future analytics and integrations must use the implemented names or approved compatibility views.
- Status: Open pending naming ratification.

## Phase 3 Open Business Decisions

1. Decimal precision by measurement dimension and whether package fractions are allowed.
2. Inventory valuation method and cost-layer design.
3. Whether transfers always require separate dispatch and receipt confirmation.
4. Stock-count snapshot versus movement-freeze policy.
5. Adjustment approval thresholds by quantity, value, category, and reason.
6. Barcode reuse, variable-weight formats, FEFO enforcement, and expired-stock exceptions.

### C-005 - Phase 4 purchase policy defaults

- The baseline requires configurable requisitions, direct receipts, receipt tolerances, mismatch approval, and payment controls, but no company-settings schema or approved thresholds exist yet.
- Phase 4 defaults to optional requisition, no direct receipt, zero over-receipt tolerance, no invoice without an approved order, and no negative-stock return.
- Impact: companies needing alternative policies require a future versioned purchase-policy table and approval matrix before those paths can be enabled.
- Status: Open pending business-policy ratification.

## Phase 4 Open Business Decisions

1. Whether requisitions are mandatory by company, category, amount, or warehouse.
2. Who may create direct receipts and invoices without an approved purchase order.
3. Quantity, price, and tax tolerance thresholds and exception approvers.
4. Whether received rejected goods enter quarantine stock or remain outside stock.
5. Landed-cost allocation rounding, currency conversion, and later valuation method.
6. Payment maker-checker thresholds, supported methods, and bank-detail encryption/key provider.
7. Supplier duplicate detection, GST/PAN validation, attachment retention, and supplier numbering.
8. Purchase-order partial-close and over/under-delivery policy.

### C-006 - Phase 5 document rendering and sales policy defaults

- Phase 5 requests printable quotations, orders, delivery challans and invoices, while object storage, template selection, launch-jurisdiction tax rules and tenant legal-document branding remain unresolved.
- Implementation: preserve document-ready records and stable references, but defer binary PDF rendering rather than shipping legally ambiguous documents. Reservations are opt-in, negative stock is blocked, direct dispatch is blocked, return excess is blocked, and immediate delivery requires an approved order.
- Impact: production document output and companies needing alternate reservation, direct-sale, credit, return or recognition policies require versioned settings and approved templates.
- Status: Open pending business-policy and legal-document ratification.

## Phase 5 Open Business Decisions

1. Reservation policy: soft/hard allocation, expiry, FEFO enforcement and reallocation priority.
2. Credit exposure timing, credit-note treatment, override thresholds and maker-checker requirements.
3. Direct dispatch and immediate-delivery eligibility, idempotency retention and tracked-goods policy.
4. Price precedence, minimum-price approval, discount/margin thresholds and tax-inclusive rounding.
5. Invoice-versus-delivery recognition, over-invoice tolerances and partial-close rules.
6. Return-without-original policy, restocking fees, condition-to-location mapping and serial reuse.
7. Credit-note manual adjustment authority, refund workflow and accounting integration.
8. Customer duplicate detection, GST/PAN validation, numbering and attachment retention.
9. Printable template, tenant branding, digital signature and launch-jurisdiction legal fields.
10. Salesperson assignment model, commissions and reporting dimensions.
